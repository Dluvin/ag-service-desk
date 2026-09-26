import { prisma } from "./prisma";
import { orgQbwcIsOn } from "./ocr-samples";
import { createQbwcSession, getQbwcSession, verifyQbwcLogin } from "./qbwc";
import { estimateAddXml, parseEstimateAddResponse } from "./qbwc-xml";

function xmlText(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<(?:[\\w-]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}>`, "i"));
  return decodeXml(match?.[1]?.trim() ?? "");
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function encodeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function operationName(xml: string, soapAction: string) {
  const action = soapAction.replace(/"/g, "");
  const fromHeader = action.split("/").pop()?.replace(/[^a-zA-Z]/g, "");
  if (fromHeader) return fromHeader;
  const match = xml.match(
    /<(?:[\w-]+:)?(authenticate|sendRequestXML|receiveResponseXML|connectionError|getLastError|closeConnection|serverVersion|clientVersion)\b/i,
  );
  return match?.[1] ?? "";
}

function soapEnvelope(inner: string) {
  return `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns="http://developer.intuit.com/"><soap:Body>${inner}</soap:Body></soap:Envelope>`;
}

function stringResult(method: string, value: string) {
  return soapEnvelope(`<${method}Response><${method}Result>${encodeXml(value)}</${method}Result></${method}Response>`);
}

function cdataResult(method: string, value: string) {
  const safe = value.replaceAll("]]>", "]]]]><![CDATA[>");
  return soapEnvelope(`<${method}Response><${method}Result><![CDATA[${safe}]]></${method}Result></${method}Response>`);
}

function intResult(method: string, value: number) {
  return soapEnvelope(`<${method}Response><${method}Result>${value}</${method}Result></${method}Response>`);
}

async function queuedCount(organizationId: string) {
  return prisma.qbEstimateJob.count({
    where: { organizationId, qbTxnId: null, status: { in: ["QUEUED", "SENDING", "ERROR", "SENT"] } },
  });
}

function isFailedHresult(hresult: string) {
  const value = hresult.trim().toLowerCase();
  if (!value) return false;
  return value !== "0" && value !== "0x0" && value !== "0x00000000" && value !== "s_ok";
}

function isRetryableEstimateJob(job: { status: string; error: string | null; qbTxnId: string | null }) {
  if (job.qbTxnId) return false;
  if (job.status === "QUEUED" || job.status === "SENDING") return true;
  if (job.status === "SENT") return true;
  if (job.status !== "ERROR") return false;
  if (!job.error) return true;
  const error = job.error.toLowerCase();
  return (
    error.includes("0x80040400") ||
    error.includes("parsing") ||
    error.includes("did not return") ||
    error.includes("xml text stream")
  );
}

async function nextRequestXml(sessionId: string, organizationId: string, major: string, minor: string) {
  if (!(await orgQbwcIsOn(organizationId))) return "";
  const session = await prisma.qbwcSession.findFirst({ where: { id: sessionId } });
  if (!session) return "";
  const candidates = await prisma.qbEstimateJob.findMany({
    where: {
      organizationId,
      qbTxnId: null,
      status: { in: ["QUEUED", "SENDING", "ERROR", "SENT"] },
    },
    orderBy: { createdAt: "asc" },
    take: 25,
  });
  const preferredId = session?.jobId;
  const job =
    candidates.find((row) => row.id === preferredId && isRetryableEstimateJob(row)) ||
    candidates.find((row) => isRetryableEstimateJob(row));
  if (!job) {
    await prisma.qbwcSession.update({ where: { id: sessionId }, data: { jobId: null } });
    return "";
  }
  await prisma.$transaction([
    prisma.qbEstimateJob.update({
      where: { id: job.id },
      data: { status: "SENDING", error: null },
    }),
    prisma.qbwcSession.update({
      where: { id: sessionId },
      data: { jobId: job.id, lastError: null },
    }),
  ]);
  return (await estimateAddXml(job.id, major, minor)) || "";
}

export function qbwcWsdl(location: string) {
  return `<?xml version="1.0" encoding="utf-8"?>
<wsdl:definitions xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/" xmlns:s="http://www.w3.org/2001/XMLSchema" xmlns:tns="http://developer.intuit.com/" targetNamespace="http://developer.intuit.com/" xmlns:wsdl="http://schemas.xmlsoap.org/wsdl/">
  <wsdl:types>
    <s:schema elementFormDefault="qualified" targetNamespace="http://developer.intuit.com/">
      <s:element name="authenticate"><s:complexType><s:sequence><s:element minOccurs="0" maxOccurs="1" name="strUserName" type="s:string"/><s:element minOccurs="0" maxOccurs="1" name="strPassword" type="s:string"/></s:sequence></s:complexType></s:element>
      <s:element name="authenticateResponse"><s:complexType><s:sequence><s:element minOccurs="0" maxOccurs="1" name="authenticateResult" type="tns:ArrayOfString"/></s:sequence></s:complexType></s:element>
      <s:complexType name="ArrayOfString"><s:sequence><s:element minOccurs="0" maxOccurs="unbounded" name="string" nillable="true" type="s:string"/></s:sequence></s:complexType>
      <s:element name="sendRequestXML"><s:complexType><s:sequence><s:element minOccurs="0" name="ticket" type="s:string"/><s:element minOccurs="0" name="strHCPResponse" type="s:string"/><s:element minOccurs="0" name="strCompanyFileName" type="s:string"/><s:element minOccurs="0" name="qbXMLCountry" type="s:string"/><s:element name="qbXMLMajorVers" type="s:int"/><s:element name="qbXMLMinorVers" type="s:int"/></s:sequence></s:complexType></s:element>
      <s:element name="sendRequestXMLResponse"><s:complexType><s:sequence><s:element minOccurs="0" name="sendRequestXMLResult" type="s:string"/></s:sequence></s:complexType></s:element>
      <s:element name="receiveResponseXML"><s:complexType><s:sequence><s:element minOccurs="0" name="ticket" type="s:string"/><s:element minOccurs="0" name="response" type="s:string"/><s:element minOccurs="0" name="hresult" type="s:string"/><s:element minOccurs="0" name="message" type="s:string"/></s:sequence></s:complexType></s:element>
      <s:element name="receiveResponseXMLResponse"><s:complexType><s:sequence><s:element name="receiveResponseXMLResult" type="s:int"/></s:sequence></s:complexType></s:element>
      <s:element name="connectionError"><s:complexType><s:sequence><s:element minOccurs="0" name="ticket" type="s:string"/><s:element minOccurs="0" name="hresult" type="s:string"/><s:element minOccurs="0" name="message" type="s:string"/></s:sequence></s:complexType></s:element>
      <s:element name="connectionErrorResponse"><s:complexType><s:sequence><s:element minOccurs="0" name="connectionErrorResult" type="s:string"/></s:sequence></s:complexType></s:element>
      <s:element name="getLastError"><s:complexType><s:sequence><s:element minOccurs="0" name="ticket" type="s:string"/></s:sequence></s:complexType></s:element>
      <s:element name="getLastErrorResponse"><s:complexType><s:sequence><s:element minOccurs="0" name="getLastErrorResult" type="s:string"/></s:sequence></s:complexType></s:element>
      <s:element name="closeConnection"><s:complexType><s:sequence><s:element minOccurs="0" name="ticket" type="s:string"/></s:sequence></s:complexType></s:element>
      <s:element name="closeConnectionResponse"><s:complexType><s:sequence><s:element minOccurs="0" name="closeConnectionResult" type="s:string"/></s:sequence></s:complexType></s:element>
      <s:element name="serverVersion"><s:complexType><s:sequence/></s:complexType></s:element>
      <s:element name="serverVersionResponse"><s:complexType><s:sequence><s:element minOccurs="0" name="serverVersionResult" type="s:string"/></s:sequence></s:complexType></s:element>
      <s:element name="clientVersion"><s:complexType><s:sequence><s:element minOccurs="0" name="strVersion" type="s:string"/></s:sequence></s:complexType></s:element>
      <s:element name="clientVersionResponse"><s:complexType><s:sequence><s:element minOccurs="0" name="clientVersionResult" type="s:string"/></s:sequence></s:complexType></s:element>
    </s:schema>
  </wsdl:types>
  <wsdl:message name="authenticateSoapIn"><wsdl:part name="parameters" element="tns:authenticate"/></wsdl:message>
  <wsdl:message name="authenticateSoapOut"><wsdl:part name="parameters" element="tns:authenticateResponse"/></wsdl:message>
  <wsdl:message name="sendRequestXMLSoapIn"><wsdl:part name="parameters" element="tns:sendRequestXML"/></wsdl:message>
  <wsdl:message name="sendRequestXMLSoapOut"><wsdl:part name="parameters" element="tns:sendRequestXMLResponse"/></wsdl:message>
  <wsdl:message name="receiveResponseXMLSoapIn"><wsdl:part name="parameters" element="tns:receiveResponseXML"/></wsdl:message>
  <wsdl:message name="receiveResponseXMLSoapOut"><wsdl:part name="parameters" element="tns:receiveResponseXMLResponse"/></wsdl:message>
  <wsdl:message name="connectionErrorSoapIn"><wsdl:part name="parameters" element="tns:connectionError"/></wsdl:message>
  <wsdl:message name="connectionErrorSoapOut"><wsdl:part name="parameters" element="tns:connectionErrorResponse"/></wsdl:message>
  <wsdl:message name="getLastErrorSoapIn"><wsdl:part name="parameters" element="tns:getLastError"/></wsdl:message>
  <wsdl:message name="getLastErrorSoapOut"><wsdl:part name="parameters" element="tns:getLastErrorResponse"/></wsdl:message>
  <wsdl:message name="closeConnectionSoapIn"><wsdl:part name="parameters" element="tns:closeConnection"/></wsdl:message>
  <wsdl:message name="closeConnectionSoapOut"><wsdl:part name="parameters" element="tns:closeConnectionResponse"/></wsdl:message>
  <wsdl:message name="serverVersionSoapIn"><wsdl:part name="parameters" element="tns:serverVersion"/></wsdl:message>
  <wsdl:message name="serverVersionSoapOut"><wsdl:part name="parameters" element="tns:serverVersionResponse"/></wsdl:message>
  <wsdl:message name="clientVersionSoapIn"><wsdl:part name="parameters" element="tns:clientVersion"/></wsdl:message>
  <wsdl:message name="clientVersionSoapOut"><wsdl:part name="parameters" element="tns:clientVersionResponse"/></wsdl:message>
  <wsdl:portType name="QBWebConnectorSvcSoap">
    <wsdl:operation name="authenticate"><wsdl:input message="tns:authenticateSoapIn"/><wsdl:output message="tns:authenticateSoapOut"/></wsdl:operation>
    <wsdl:operation name="sendRequestXML"><wsdl:input message="tns:sendRequestXMLSoapIn"/><wsdl:output message="tns:sendRequestXMLSoapOut"/></wsdl:operation>
    <wsdl:operation name="receiveResponseXML"><wsdl:input message="tns:receiveResponseXMLSoapIn"/><wsdl:output message="tns:receiveResponseXMLSoapOut"/></wsdl:operation>
    <wsdl:operation name="connectionError"><wsdl:input message="tns:connectionErrorSoapIn"/><wsdl:output message="tns:connectionErrorSoapOut"/></wsdl:operation>
    <wsdl:operation name="getLastError"><wsdl:input message="tns:getLastErrorSoapIn"/><wsdl:output message="tns:getLastErrorSoapOut"/></wsdl:operation>
    <wsdl:operation name="closeConnection"><wsdl:input message="tns:closeConnectionSoapIn"/><wsdl:output message="tns:closeConnectionSoapOut"/></wsdl:operation>
    <wsdl:operation name="serverVersion"><wsdl:input message="tns:serverVersionSoapIn"/><wsdl:output message="tns:serverVersionSoapOut"/></wsdl:operation>
    <wsdl:operation name="clientVersion"><wsdl:input message="tns:clientVersionSoapIn"/><wsdl:output message="tns:clientVersionSoapOut"/></wsdl:operation>
  </wsdl:portType>
  <wsdl:binding name="QBWebConnectorSvcSoap" type="tns:QBWebConnectorSvcSoap">
    <soap:binding transport="http://schemas.xmlsoap.org/soap/http" style="document"/>
    <wsdl:operation name="authenticate"><soap:operation soapAction="http://developer.intuit.com/authenticate" style="document"/><wsdl:input><soap:body use="literal"/></wsdl:input><wsdl:output><soap:body use="literal"/></wsdl:output></wsdl:operation>
    <wsdl:operation name="sendRequestXML"><soap:operation soapAction="http://developer.intuit.com/sendRequestXML" style="document"/><wsdl:input><soap:body use="literal"/></wsdl:input><wsdl:output><soap:body use="literal"/></wsdl:output></wsdl:operation>
    <wsdl:operation name="receiveResponseXML"><soap:operation soapAction="http://developer.intuit.com/receiveResponseXML" style="document"/><wsdl:input><soap:body use="literal"/></wsdl:input><wsdl:output><soap:body use="literal"/></wsdl:output></wsdl:operation>
    <wsdl:operation name="connectionError"><soap:operation soapAction="http://developer.intuit.com/connectionError" style="document"/><wsdl:input><soap:body use="literal"/></wsdl:input><wsdl:output><soap:body use="literal"/></wsdl:output></wsdl:operation>
    <wsdl:operation name="getLastError"><soap:operation soapAction="http://developer.intuit.com/getLastError" style="document"/><wsdl:input><soap:body use="literal"/></wsdl:input><wsdl:output><soap:body use="literal"/></wsdl:output></wsdl:operation>
    <wsdl:operation name="closeConnection"><soap:operation soapAction="http://developer.intuit.com/closeConnection" style="document"/><wsdl:input><soap:body use="literal"/></wsdl:input><wsdl:output><soap:body use="literal"/></wsdl:output></wsdl:operation>
    <wsdl:operation name="serverVersion"><soap:operation soapAction="http://developer.intuit.com/serverVersion" style="document"/><wsdl:input><soap:body use="literal"/></wsdl:input><wsdl:output><soap:body use="literal"/></wsdl:output></wsdl:operation>
    <wsdl:operation name="clientVersion"><soap:operation soapAction="http://developer.intuit.com/clientVersion" style="document"/><wsdl:input><soap:body use="literal"/></wsdl:input><wsdl:output><soap:body use="literal"/></wsdl:output></wsdl:operation>
  </wsdl:binding>
  <wsdl:service name="QBWebConnectorSvc">
    <wsdl:port name="QBWebConnectorSvcSoap" binding="tns:QBWebConnectorSvcSoap">
      <soap:address location="${encodeXml(location)}"/>
    </wsdl:port>
  </wsdl:service>
</wsdl:definitions>`;
}

export function qbwcFile(opts: {
  appName: string;
  appUrl: string;
  supportUrl: string;
  username: string;
  ownerId: string;
  fileId: string;
}) {
  return `<?xml version="1.0"?>
<QBWCXML>
  <AppName>${encodeXml(opts.appName)}</AppName>
  <AppID></AppID>
  <AppURL>${encodeXml(opts.appUrl)}</AppURL>
  <AppDescription>Create QuickBooks Desktop estimates from AG Desk Pro work orders.</AppDescription>
  <AppSupport>${encodeXml(opts.supportUrl)}</AppSupport>
  <UserName>${encodeXml(opts.username)}</UserName>
  <OwnerID>${encodeXml(opts.ownerId)}</OwnerID>
  <FileID>${encodeXml(opts.fileId)}</FileID>
  <QBType>QBFS</QBType>
  <AuthFlags>0xF</AuthFlags>
  <Scheduler>
    <RunEveryNMinutes>15</RunEveryNMinutes>
  </Scheduler>
</QBWCXML>
`;
}

export async function handleQbwcSoap(xml: string, soapAction: string) {
  const op = operationName(xml, soapAction).toLowerCase();
  if (op === "serverversion") return stringResult("serverVersion", "1.0");
  if (op === "clientversion") return stringResult("clientVersion", "");
  if (op === "authenticate") {
    const username = xmlText(xml, "strUserName");
    const password = xmlText(xml, "strPassword");
    const config = await verifyQbwcLogin(username, password);
    if (!config || !(await orgQbwcIsOn(config.organizationId))) {
      return soapEnvelope(
        `<authenticateResponse><authenticateResult><string></string><string>nvu</string></authenticateResult></authenticateResponse>`,
      );
    }
    const session = await createQbwcSession(config.organizationId);
    return soapEnvelope(
      `<authenticateResponse><authenticateResult><string>${session.id}</string><string></string></authenticateResult></authenticateResponse>`,
    );
  }
  if (op === "sendrequestxml") {
    const ticket = xmlText(xml, "ticket");
    const session = await getQbwcSession(ticket);
    if (!session) return stringResult("sendRequestXML", "");
    const companyName = xmlText(xmlText(xml, "strHCPResponse"), "CompanyName");
    if (companyName) {
      await prisma.qbwcConfig.update({
        where: { organizationId: session.organizationId },
        data: { companyName, lastSyncAt: new Date() },
      });
    }
    const major = xmlText(xml, "qbXMLMajorVers") || "13";
    const minor = xmlText(xml, "qbXMLMinorVers") || "0";
    const request = await nextRequestXml(ticket, session.organizationId, major, minor);
    return request ? cdataResult("sendRequestXML", request) : stringResult("sendRequestXML", "");
  }
  if (op === "receiveresponsexml") {
    const ticket = xmlText(xml, "ticket");
    const session = await getQbwcSession(ticket);
    if (!session) return intResult("receiveResponseXML", 100);
    const hresult = xmlText(xml, "hresult");
    const message = xmlText(xml, "message");
    const response = xmlText(xml, "response");
    const jobId = session.jobId;
    if (jobId) {
      if (isFailedHresult(hresult)) {
        const error = message || hresult;
        await prisma.$transaction([
          prisma.qbEstimateJob.update({
            where: { id: jobId },
            data: { status: "ERROR", error },
          }),
          prisma.qbwcSession.update({ where: { id: ticket }, data: { jobId: null, lastError: error } }),
          prisma.qbwcConfig.update({
            where: { organizationId: session.organizationId },
            data: { lastError: error },
          }),
        ]);
      } else {
        const parsed = parseEstimateAddResponse(response);
        if (parsed.error) {
          await prisma.$transaction([
            prisma.qbEstimateJob.update({
              where: { id: jobId },
              data: { status: "ERROR", error: parsed.error },
            }),
            prisma.qbwcSession.update({ where: { id: ticket }, data: { jobId: null, lastError: parsed.error } }),
            prisma.qbwcConfig.update({
              where: { organizationId: session.organizationId },
              data: { lastError: parsed.error },
            }),
          ]);
        } else {
          await prisma.$transaction([
            prisma.qbEstimateJob.update({
              where: { id: jobId },
              data: {
                status: "SENT",
                qbTxnId: parsed.txnId || null,
                qbRefNumber: parsed.refNumber || null,
                error: null,
              },
            }),
            prisma.qbwcSession.update({ where: { id: ticket }, data: { jobId: null, lastError: null } }),
            prisma.qbwcConfig.update({
              where: { organizationId: session.organizationId },
              data: { lastError: null, lastSyncAt: new Date() },
            }),
          ]);
        }
      }
    }
    const remaining = await queuedCount(session.organizationId);
    return intResult("receiveResponseXML", remaining > 0 ? 50 : 100);
  }
  if (op === "connectionerror") {
    const ticket = xmlText(xml, "ticket");
    const error = xmlText(xml, "message") || xmlText(xml, "hresult");
    const session = await getQbwcSession(ticket);
    if (session) {
      await prisma.qbwcSession.update({ where: { id: ticket }, data: { lastError: error || "Connection error" } });
      if (session.jobId) {
        await prisma.qbEstimateJob.update({
          where: { id: session.jobId },
          data: { status: "ERROR", error: error || "Connection error" },
        });
      }
      await prisma.qbwcConfig.update({
        where: { organizationId: session.organizationId },
        data: { lastError: error || "Connection error" },
      });
    }
    return stringResult("connectionError", "done");
  }
  if (op === "getlasterror") {
    const session = await getQbwcSession(xmlText(xml, "ticket"));
    return stringResult("getLastError", session?.lastError ?? "");
  }
  if (op === "closeconnection") return stringResult("closeConnection", "OK");
  return stringResult("getLastError", "Unknown SOAP method");
}
