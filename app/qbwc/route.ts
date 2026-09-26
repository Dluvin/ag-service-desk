import { NextRequest, NextResponse } from "next/server";
import { handleQbwcSoap, qbwcWsdl } from "@/lib/qbwc-soap";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function serviceUrl(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3002";
  const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}/qbwc`;
}

function xmlResponse(body: string, contentType: string) {
  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": "no-store",
    },
  });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  if (url.searchParams.has("wsdl") || url.pathname.endsWith(".wsdl")) {
    return xmlResponse(qbwcWsdl(serviceUrl(request)), "text/xml; charset=utf-8");
  }
  return new NextResponse("QuickBooks Web Connector service for AGDESKPRO.", {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export async function POST(request: NextRequest) {
  const xml = await request.text();
  const soapAction = request.headers.get("soapaction") || request.headers.get("SOAPAction") || "";
  const body = await handleQbwcSoap(xml, soapAction);
  return xmlResponse(body, "text/xml; charset=utf-8");
}
