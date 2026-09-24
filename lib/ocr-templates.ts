export const OCR_TEMPLATE_KEYS = [
  "irrigation-service-order",
  "valley-service-order",
  "lindsay-service-order",
] as const;

export type OcrTemplateKey = (typeof OCR_TEMPLATE_KEYS)[number];

export const DEFAULT_OCR_TEMPLATE: OcrTemplateKey = "irrigation-service-order";

const SHARED_FIELDS = `bill to / customer, contact, phone, farm / job site, paper number, date,
unit type (pivot, pump, pipe, wire, generator, electrical, other), unit id, make, model, age of equipment,
problem, service performed, equipment used, crew / technician, start time, stop time, labor hours,
parts, parts on truck, service truck, warranty / hold for warranty, completion notice, invoice / total to invoice`;

export const OCR_JSON_SPEC = `Extract JSON with:
paperNumber, date, billTo, customer, contact, contactPhone,
farmName, jobSite, completionNotice (YES or NO),
warranty / holdForWarranty (YES or NO),
unitType (PIVOT, PUMP, PIPE, WIRE, GENERATOR, ELECTRICAL, or OTHER),
unitId, ageOfEq, make, model,
problem, servicePerformed, title (short problem),
technician / crew, startTime, stopTime, laborHours,
serviceTruck, partsOnTruck, invoiceNumber, invoiceAmount / totalToInvoice,
equipmentUsed (array of names),
parts (array of {quantity, name, sku, notes}),
labor (array of {quantity as hours, name as crew, sku, notes}),
equipment, rawText (full transcription).
quantity must be a number. Empty string if unreadable.`;

export const OCR_TEMPLATES: Record<
  OcrTemplateKey,
  { id: OcrTemplateKey; name: string; layout: string; fields: string }
> = {
  "irrigation-service-order": {
    id: "irrigation-service-order",
    name: "Irrigation service order",
    layout:
      "Built-in irrigation SERVICE ORDER (landscape, red NUMBER top right). Boxes: BILL TO, CONTACT, FARM NAME, UNIT ID with PIVOT/PUMP/PIPE/WIRE/GENERATOR/ELECTRICAL circled, AGE OF EQ, MAKE/MODEL, DESCRIBE PROBLEM, DETAIL SERVICE PERFORMED, EQUIPMENT USED (circled machine names), LIST DATES & WHO WORKED, labor hours, SERVICE TRUCK, TOTAL TO INVOICE, HOLD FOR WARRANTY, COMPLETION NOTIFICATION.",
    fields: SHARED_FIELDS,
  },
  "valley-service-order": {
    id: "valley-service-order",
    name: "Valley service order",
    layout:
      "Typical Valley irrigation dealer field ticket / service order. Look for dealer header, job or ticket number, customer or bill-to, farm or pivot location, serial or unit, complaint or work requested, work performed, parts list, labor hours, technician.",
    fields: SHARED_FIELDS,
  },
  "lindsay-service-order": {
    id: "lindsay-service-order",
    name: "Lindsay service order",
    layout:
      "Typical Lindsay / Zimmatic dealer service report. Look for dealer and customer, machine serial, hours, description of work, parts used, labor, date, technician.",
    fields: SHARED_FIELDS,
  },
};

export function parseOcrTemplateKey(value: string | null | undefined): OcrTemplateKey {
  return OCR_TEMPLATE_KEYS.includes(value as OcrTemplateKey)
    ? (value as OcrTemplateKey)
    : DEFAULT_OCR_TEMPLATE;
}

export function ocrSystemPrompt(input: {
  templateKey: OcrTemplateKey;
  fieldNotes: string;
  sampleCount: number;
}) {
  const template = OCR_TEMPLATES[input.templateKey];
  const extra = input.fieldNotes.trim()
    ? ` Extra field notes from this company: ${input.fieldNotes.trim()}`
    : "";
  if (input.sampleCount > 0) {
    return `You read this irrigation company's paper ticket. The first ${input.sampleCount} image(s) are their blank or filled sample of the form. The last image is the job to extract. Use the sample layout. Named pad: ${template.name}. ${template.layout} Fields to fill: ${template.fields}.${extra} Return JSON only. title is a short version of the problem.`;
  }
  return `You read photos of this irrigation company's paper ticket (${template.name}). ${template.layout} Fields to fill: ${template.fields}.${extra} Return JSON only. title is a short version of the problem.`;
}

export function ocrUserPrompt(sampleCount: number) {
  if (sampleCount > 0) {
    return `The last image is the filled ticket for this job. The earlier image(s) are this company's form sample. ${OCR_JSON_SPEC}`;
  }
  return `This is this company's paper service ticket. ${OCR_JSON_SPEC}`;
}
