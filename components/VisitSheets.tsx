import { Fragment } from "react";
import { InspectionSheet } from "@/components/InspectionSheet";
import type { VisitDraft } from "@/lib/inspection-form";

export function VisitSheets({
  companyName,
  customerName,
  inspectedOn,
  inspectedBy,
  visit,
}: {
  companyName: string;
  customerName: string;
  inspectedOn: string;
  inspectedBy: string;
  visit: VisitDraft;
}) {
  return (
    <Fragment>
      <InspectionSheet
        companyName={companyName}
        kind="point"
        customerName={customerName}
        inspectedOn={inspectedOn}
        inspectedBy={inspectedBy}
        header={{
          pivotId: visit.pivotId,
          serialNumber: visit.serialNumber,
          modelNumber: visit.modelNumber,
          fuseSize: visit.fuseSize,
          hours: visit.hours,
          towerCount: String(visit.towerCount),
        }}
        checks={visit.pointChecks}
        extra={[{ label: "Brand", value: visit.brand }]}
      />
      {visit.towers.map((tower, index) => (
        <InspectionSheet
          key={`${index}-${tower.tireSize}`}
          companyName={companyName}
          kind="tower"
          customerName={customerName}
          inspectedOn={inspectedOn}
          inspectedBy={inspectedBy}
          kicker={`Tower ${index + 1} of ${visit.towerCount}`}
          header={{
            pivotNumber: visit.serialNumber || visit.pivotId,
            towerNumber: String(index + 1),
            tireSize: tower.tireSize,
            gearMotorRpm: tower.gearMotorRpm,
          }}
          checks={tower.checks}
        />
      ))}
    </Fragment>
  );
}
