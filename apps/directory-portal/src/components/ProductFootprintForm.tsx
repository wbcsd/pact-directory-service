import React, { useState } from "react";
import { Button, Heading, Text, Box } from "@radix-ui/themes";
import * as Form from "@radix-ui/react-form";
import { FormField, TextField, SelectField } from "./ui";
import { TagInput } from "./ui/TagInput";
import {
  ProductFootprint,
  CarbonFootprint,
  CarbonFootprintDeclaredUnitOfMeasurement,
  CarbonFootprintGeographyRegionOrSubregion,
  CarbonFootprintCcuCalculationApproach,
  ProductFootprintStatus,
} from "pact-data-model/v3_0";

/** Build SelectField option list from a string enum's values. Labels capitalize the first letter. */
function enumToOptions(e: Record<string, string>): { value: string; label: string }[] {
  return Object.values(e).map((v) => ({
    value: v,
    label: v.charAt(0).toUpperCase() + v.slice(1),
  }));
}

const NONE_OPTION = { value: "-", label: "— None —" };

const UNIT_OPTIONS = enumToOptions(CarbonFootprintDeclaredUnitOfMeasurement);
const STATUS_OPTIONS = enumToOptions(ProductFootprintStatus);
const GEOGRAPHY_REGION_OPTIONS = [NONE_OPTION, ...enumToOptions(CarbonFootprintGeographyRegionOrSubregion)];
const CCU_APPROACH_OPTIONS = [NONE_OPTION, ...enumToOptions(CarbonFootprintCcuCalculationApproach)];

// Maps every key of T to string, making all fields required — the form always holds strings.
type AllStrings<T> = { [K in keyof T]-?: string };

// All CarbonFootprint fields collapsed to string (enum / bool / string[] → string).
// Complex sub-objects not shown in the basic form are omitted.
export type CarbonFootprintFormData = AllStrings<
  Omit<CarbonFootprint,
    | 'productOrSectorSpecificRules'
    | 'secondaryEmissionFactorSources'
    | 'dqi'
    | 'verification'
  >
>;

// ProductFootprint minus server-generated fields, with array fields kept and pcf typed for the form.
export type ProductFootprintFormData = AllStrings<
  Omit<ProductFootprint,
    | 'id' | 'specVersion' | 'version' | 'created' | 'precedingPfIds' | 'extensions'
    | 'companyIds' | 'productIds' | 'productClassifications' | 'pcf'
  >
> & {
  companyIds: string[];
  productIds: string[];
  productClassifications: string[];
  pcf: CarbonFootprintFormData;
};

// The schema-compatible shape emitted by onSubmit (server fills in id / version / created).
// export type ProductFootprintInput = Omit<ProductFootprint, 'id' | 'specVersion' | 'version' | 'created'>;

interface ProductFootprintFormProps {
  onSubmit?: (data: ProductFootprint) => void;
  isSubmitting?: boolean;
  initialData?: Partial<ProductFootprint>;
  readOnly?: boolean;
}

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Heading as="h3" size="3" mt="5" mb="2" style={{ borderBottom: "1px solid var(--gray-4)", paddingBottom: "8px" }}>
    {children}
  </Heading>
);

const FieldGrid: React.FC<{ columns?: 2 | 3; children: React.ReactNode }> = ({ columns = 2, children }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: "0 16px" }}>
    {children}
  </div>
);

const BOOLEAN_OPTIONS = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

/** Strip time component from a date-time string so <input type="date"> displays correctly. */
function toDateOnly(value?: string): string {
  if (!value) return '';
  return value.split('T')[0];
}

/** Append midnight UTC to a date-only string (YYYY-MM-DD → ISO 8601). */
function toIsoDateTime(dateOnly: string): string {
  return `${dateOnly}T00:00:00.000Z`;
}

/** Convert a ProductFootprint (or partial, e.g. for a new form) into flat string form state. */
function footprintToFormData(data: Partial<ProductFootprint>): ProductFootprintFormData {
  const pcf = (data.pcf ?? {}) as Partial<CarbonFootprint>;
  return {
    ...(data as any),
    status: data.status ?? 'Active',
    companyIds: data.companyIds ?? [],
    productIds: data.productIds ?? [],
    productClassifications: data.productClassifications ?? [],
    validityPeriodStart: toDateOnly(data.validityPeriodStart),
    validityPeriodEnd: toDateOnly(data.validityPeriodEnd),
    pcf: {
      ...(pcf as any),
      declaredUnitOfMeasurement: pcf.declaredUnitOfMeasurement ?? 'kilogram',
      referencePeriodStart: toDateOnly(pcf.referencePeriodStart),
      referencePeriodEnd: toDateOnly(pcf.referencePeriodEnd),
      packagingEmissionsIncluded: String(pcf.packagingEmissionsIncluded ?? false),
      ccsTechnologicalCO2CaptureIncluded: String(pcf.ccsTechnologicalCO2CaptureIncluded ?? false),
      ipccCharacterizationFactors: pcf.ipccCharacterizationFactors?.join(', ') ?? 'AR6',
      crossSectoralStandards: pcf.crossSectoralStandards?.join(', ') ?? 'PACT-3.0',
    },
  } as ProductFootprintFormData;
}

/** Remove empty strings and the SelectField 'None' sentinel so optional fields are absent in the API payload. */
function omitEmpty(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== '' && v !== undefined && v !== '-')
  );
}

/** Convert flat string form state back into a schema-compatible ProductFootprint */
function formDataToFootprint(form: ProductFootprintFormData): ProductFootprint {
  const { pcf } = form;
  return {
    ...(omitEmpty(form as any) as any),
    companyIds: form.companyIds,
    productIds: form.productIds,
    productClassifications: form.productClassifications.length > 0 ? form.productClassifications : undefined,
    validityPeriodStart: form.validityPeriodStart ? toIsoDateTime(form.validityPeriodStart) : undefined,
    validityPeriodEnd: form.validityPeriodEnd ? toIsoDateTime(form.validityPeriodEnd) : undefined,
    pcf: {
      ...(omitEmpty(pcf as any) as any),
      referencePeriodStart: toIsoDateTime(pcf.referencePeriodStart),
      referencePeriodEnd: toIsoDateTime(pcf.referencePeriodEnd),
      packagingEmissionsIncluded: pcf.packagingEmissionsIncluded === 'true',
      ccsTechnologicalCO2CaptureIncluded: pcf.ccsTechnologicalCO2CaptureIncluded === 'true',
      ipccCharacterizationFactors: pcf.ipccCharacterizationFactors.split(',').map(s => s.trim()).filter(Boolean),
      crossSectoralStandards: pcf.crossSectoralStandards.split(',').map(s => s.trim()).filter(Boolean),
    },
  } as ProductFootprint;
}

const ProductFootprintForm: React.FC<ProductFootprintFormProps> = ({
  onSubmit,
  isSubmitting = false,
  initialData,
  readOnly = false,
}) => {
  const [formData, setFormData] = useState<ProductFootprintFormData>(() => footprintToFormData(initialData ?? {}));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePcfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, pcf: { ...prev.pcf, [name]: value } }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!readOnly && onSubmit) {
      onSubmit(formDataToFootprint(formData));
    }
  };

  return (
    <Form.Root onSubmit={handleSubmit} className="form-root">

      {/* ── Product Information ── */}
      <SectionHeading>Product Information</SectionHeading>

      <FormField name="status" label="Status" required>
        <SelectField disabled={readOnly}
          defaultValue={formData.status}
          options={STATUS_OPTIONS}
          onValueChange={(status) => setFormData((prev) => ({ ...prev, status }))}
        />
      </FormField>

      <FormField name="companyName" label="Company Name" required>
        <TextField
          value={formData.companyName}
          placeholder="Name of the data owner company"
          tooltip="The name of the company that is the PCF Data Owner."
          readOnly={readOnly} onChange={handleChange}
        />
      </FormField>

      <FormField
        name="companyIds"
        label="Company IDs"
        required
        description="Comma-separated URNs uniquely identifying the data owner (e.g. urn:company:example:co1)."
      >
        <TagInput
          value={formData.companyIds}
          placeholder="urn:company:example:company1"
          disabled={readOnly}
          onChange={(companyIds) => setFormData((prev) => ({ ...prev, companyIds }))}
        />
      </FormField>

      <FormField name="productNameCompany" label="Product Trade Name" required>
        <TextField
          required
          value={formData.productNameCompany}
          placeholder="Product trade name recognizable by the receiver"
          tooltip="The trade name of the product as used by the producing company."
          readOnly={readOnly} onChange={handleChange}
        />
      </FormField>

      <FormField name="productDescription" label="Product Description" required>
        <TextField
          required
          value={formData.productDescription}
          placeholder="Free-form description including technology, packaging, etc."
          tooltip="Description of the product including any additional relevant information such as production technology, packaging, process, feedstock and technical parameters."
          readOnly={readOnly} onChange={handleChange}
        />
      </FormField>

      <FormField
        name="productIds"
        label="Product IDs"
        required
        description="URNs uniquely identifying the product (e.g. urn:gtin:4012345678901)."
      >
        <TagInput
          value={formData.productIds}
          placeholder="urn:gtin:4012345678901"
          disabled={readOnly}
          onChange={(productIds) => setFormData((prev) => ({ ...prev, productIds }))}
        />
      </FormField>

      <FormField
        name="productClassifications"
        label="Product Classifications"
        description="Classification URNs (e.g. urn:pact:productclassification:un-cpc:1234)."
      >
        <TagInput
          value={formData.productClassifications}
          placeholder="urn:pact:productclassification:un-cpc:1234"
          disabled={readOnly}
          onChange={(productClassifications) => setFormData((prev) => ({ ...prev, productClassifications }))}
        />
      </FormField>

      <FormField name="comment" label="Comment" description="Additional information related to the PCF calculation, methodology changes, or interpretation guidance.">
        <TextField
          value={formData.comment}
          placeholder="Additional notes"
          readOnly={readOnly} onChange={handleChange}
        />
      </FormField>

      {/* ── Validity Period ── */}
      <SectionHeading>Validity Period</SectionHeading>
      <Text size="1" color="gray" mb="2" as="p">
        If not specified, the footprint is valid for 3 years after the reference period end.
      </Text>

      <FieldGrid>
        <FormField name="validityPeriodStart" label="Validity Period Start">
          <TextField
            type="date"
            value={formData.validityPeriodStart}
            readOnly={readOnly} onChange={handleChange}
          />
        </FormField>

        <FormField name="validityPeriodEnd" label="Validity Period End">
          <TextField
            type="date"
            value={formData.validityPeriodEnd}
            readOnly={readOnly} onChange={handleChange}
          />
        </FormField>
      </FieldGrid>

      {/* ── Carbon Footprint – Declared Unit ── */}
      <SectionHeading>Declared Unit</SectionHeading>

      <FieldGrid columns={3}>
        <FormField
          name="declaredUnitOfMeasurement"
          label="Unit of Measurement"
          required
          description="Emissions are expressed in kgCO2e per declared unit."
        >
          <SelectField disabled={readOnly}
            defaultValue={formData.pcf.declaredUnitOfMeasurement}
            options={UNIT_OPTIONS}
            onValueChange={(declaredUnitOfMeasurement) => setFormData((prev) => ({ ...prev, pcf: { ...prev.pcf, declaredUnitOfMeasurement } }))}
          />
        </FormField>

        <FormField name="declaredUnitAmount" label="Declared Unit Amount" required>
          <TextField
            required
            value={formData.pcf.declaredUnitAmount}
            placeholder="e.g. 12.5"
            tooltip="The amount of units contained within the product to which the PCF refers."
            readOnly={readOnly} onChange={handlePcfChange}
          />
        </FormField>

        <FormField
          name="productMassPerDeclaredUnit"
          label="Mass per Declared Unit (kg)"
          required
          description="Excluding packaging. Use 0 if not applicable."
        >
          <TextField
            required
            value={formData.pcf.productMassPerDeclaredUnit}
            placeholder="e.g. 9.86"
            readOnly={readOnly} onChange={handlePcfChange}
          />
        </FormField>
      </FieldGrid>

      {/* ── Carbon Footprint – Reference Period ── */}
      <SectionHeading>Reference Period</SectionHeading>

      <FieldGrid>
        <FormField name="referencePeriodStart" label="Reference Period Start" required>
          <TextField
            required
            type="date"
            value={formData.pcf.referencePeriodStart}
            tooltip="Start of the time boundary for which the PCF is representative."
            readOnly={readOnly} 
            onChange={handlePcfChange}
          />
        </FormField>

        <FormField name="referencePeriodEnd" label="Reference Period End" required>
          <TextField
            required
            type="date"
            value={formData.pcf.referencePeriodEnd}
            tooltip="End of the time boundary for which the PCF is representative."
            readOnly={readOnly} 
            onChange={handlePcfChange}
          />
        </FormField>
      </FieldGrid>

      {/* ── Carbon Footprint – Geography ── */}
      <SectionHeading>Geography</SectionHeading>
      <Text size="1" color="gray" mb="2" as="p">
        Specify at most one level of geographic granularity: region/subregion, country, or country subdivision.
      </Text>

      <FieldGrid columns={3}>
        <FormField name="geographyRegionOrSubregion" label="Region or Subregion">
          <SelectField disabled={readOnly}
            defaultValue={formData.pcf.geographyRegionOrSubregion}
            options={GEOGRAPHY_REGION_OPTIONS}
            onValueChange={(geographyRegionOrSubregion) => setFormData((prev) => ({ ...prev, pcf: { ...prev.pcf, geographyRegionOrSubregion } }))}
          />
        </FormField>

        <FormField name="geographyCountry" label="Country (ISO 3166-1 alpha-2)">
          <TextField
            value={formData.pcf.geographyCountry}
            placeholder="e.g. DE"
            tooltip="ISO 3166-1 alpha-2 country code."
            readOnly={readOnly} onChange={handlePcfChange}
          />
        </FormField>

        <FormField name="geographyCountrySubdivision" label="Subdivision (ISO 3166-2)">
          <TextField
            value={formData.pcf.geographyCountrySubdivision}
            placeholder="e.g. DE-BW"
            tooltip="ISO 3166-2 country subdivision code."
            readOnly={readOnly} onChange={handlePcfChange}
          />
        </FormField>
      </FieldGrid>

      {/* ── Carbon Footprint – Emission Values ── */}
      <SectionHeading>Emission Values</SectionHeading>

      <FieldGrid>
        <FormField name="pcfExcludingBiogenicUptake" label="PCF Excl. Biogenic Uptake" required description="kgCO2e/unit. Excl. biogenic CO₂ uptake.">
          <TextField required value={formData.pcf.pcfExcludingBiogenicUptake} placeholder="e.g. 5.14" readOnly={readOnly} onChange={handlePcfChange} />
        </FormField>

        <FormField name="pcfIncludingBiogenicUptake" label="PCF Incl. Biogenic Uptake" required description="kgCO2e/unit. Incl. biogenic CO₂ uptake.">
          <TextField required value={formData.pcf.pcfIncludingBiogenicUptake} placeholder="e.g. -14.22" readOnly={readOnly} onChange={handlePcfChange} />
        </FormField>
      </FieldGrid>

      <FieldGrid columns={3}>
        <FormField name="fossilGhgEmissions" label="Fossil GHG Emissions" required description="kgCO2e/unit.">
          <TextField required value={formData.pcf.fossilGhgEmissions} placeholder="e.g. 3.20" readOnly={readOnly} onChange={handlePcfChange} />
        </FormField>

        <FormField name="fossilCarbonContent" label="Fossil Carbon Content" required description="kgC/unit.">
          <TextField required value={formData.pcf.fossilCarbonContent} placeholder="e.g. 0.50" readOnly={readOnly} onChange={handlePcfChange} />
        </FormField>

        <FormField name="biogenicCarbonContent" label="Biogenic Carbon Content" description="kgC/unit.">
          <TextField value={formData.pcf.biogenicCarbonContent} placeholder="e.g. 0.10" readOnly={readOnly} onChange={handlePcfChange} />
        </FormField>

        <FormField name="recycledCarbonContent" label="Recycled Carbon Content" description="kgC/unit.">
          <TextField value={formData.pcf.recycledCarbonContent} placeholder="e.g. 0.05" readOnly={readOnly} onChange={handlePcfChange} />
        </FormField>

        <FormField name="landUseChangeGhgEmissions" label="Land Use Change GHG" description="kgCO2e/unit.">
          <TextField value={formData.pcf.landUseChangeGhgEmissions} placeholder="e.g. 0.30" readOnly={readOnly} onChange={handlePcfChange} />
        </FormField>

        <FormField name="landCarbonLeakage" label="Land Carbon Leakage" description="kgCO2e/unit.">
          <TextField value={formData.pcf.landCarbonLeakage} placeholder="e.g. 0.00" readOnly={readOnly} onChange={handlePcfChange} />
        </FormField>

        <FormField name="landManagementFossilGhgEmissions" label="Land Mgmt Fossil GHG" description="kgCO2e/unit.">
          <TextField value={formData.pcf.landManagementFossilGhgEmissions} placeholder="e.g. 0.10" readOnly={readOnly} onChange={handlePcfChange} />
        </FormField>

        <FormField name="landManagementBiogenicCO2Emissions" label="Land Mgmt Biogenic CO₂" description="kgCO2e/unit.">
          <TextField value={formData.pcf.landManagementBiogenicCO2Emissions} placeholder="e.g. 0.05" readOnly={readOnly} onChange={handlePcfChange} />
        </FormField>

        <FormField name="landManagementBiogenicCO2Removals" label="Land Mgmt Bio Removals" description="kgCO2e/unit. Must be ≤ 0.">
          <TextField value={formData.pcf.landManagementBiogenicCO2Removals} placeholder="e.g. -0.20" readOnly={readOnly} onChange={handlePcfChange} />
        </FormField>

        <FormField name="biogenicCO2Uptake" label="Biogenic CO₂ Uptake" description="kgCO2e/unit. Must be ≤ 0.">
          <TextField value={formData.pcf.biogenicCO2Uptake} placeholder="e.g. -1.50" readOnly={readOnly} onChange={handlePcfChange} />
        </FormField>

        <FormField name="biogenicNonCO2Emissions" label="Biogenic Non-CO₂" description="kgCO2e/unit.">
          <TextField value={formData.pcf.biogenicNonCO2Emissions} placeholder="e.g. 0.02" readOnly={readOnly} onChange={handlePcfChange} />
        </FormField>

        <FormField name="landAreaOccupation" label="Land Area Occupation" description="m²/year per unit.">
          <TextField value={formData.pcf.landAreaOccupation} placeholder="e.g. 2.00" readOnly={readOnly} onChange={handlePcfChange} />
        </FormField>
      </FieldGrid>

      {/* ── Transport & Packaging ── */}
      <SectionHeading>Transport &amp; Packaging</SectionHeading>

      <FieldGrid columns={3}>
        <FormField name="aircraftGhgEmissions" label="Aircraft GHG" description="kgCO2e/unit, excl. radiative forcing.">
          <TextField value={formData.pcf.aircraftGhgEmissions} placeholder="e.g. 0.15" readOnly={readOnly} onChange={handlePcfChange} />
        </FormField>

        <FormField name="packagingEmissionsIncluded" label="Packaging Included" required>
          <SelectField disabled={readOnly}
            defaultValue={formData.pcf.packagingEmissionsIncluded}
            options={BOOLEAN_OPTIONS}
            onValueChange={(packagingEmissionsIncluded) => setFormData((prev) => ({ ...prev, pcf: { ...prev.pcf, packagingEmissionsIncluded } }))}
          />
        </FormField>

        <FormField name="outboundLogisticsGhgEmissions" label="Outbound Logistics GHG" description="kgCO2e/unit.">
          <TextField value={formData.pcf.outboundLogisticsGhgEmissions} placeholder="e.g. 0.08" readOnly={readOnly} onChange={handlePcfChange} />
        </FormField>
      </FieldGrid>

      {formData.pcf.packagingEmissionsIncluded === "true" && (
        <FieldGrid>
          <FormField name="packagingGhgEmissions" label="Packaging GHG Emissions" description="kgCO2e/unit.">
            <TextField value={formData.pcf.packagingGhgEmissions} placeholder="e.g. 0.30" readOnly={readOnly} onChange={handlePcfChange} />
          </FormField>

          <FormField name="packagingBiogenicCarbonContent" label="Packaging Biogenic Carbon" description="kgC/unit.">
            <TextField value={formData.pcf.packagingBiogenicCarbonContent} placeholder="e.g. 0.01" readOnly={readOnly} onChange={handlePcfChange} />
          </FormField>
        </FieldGrid>
      )}

      {/* ── CCS / CCU ── */}
      <SectionHeading>Carbon Capture &amp; Storage / Usage</SectionHeading>

      <FieldGrid columns={3}>
        <FormField name="ccsTechnologicalCO2CaptureIncluded" label="CCS Included" required>
          <SelectField disabled={readOnly}
            defaultValue={formData.pcf.ccsTechnologicalCO2CaptureIncluded}
            options={BOOLEAN_OPTIONS}
            onValueChange={(ccsTechnologicalCO2CaptureIncluded) => setFormData((prev) => ({ ...prev, pcf: { ...prev.pcf, ccsTechnologicalCO2CaptureIncluded } }))}
          />
        </FormField>

        <FormField name="ccuCarbonContent" label="CCU Carbon Content" description="kgC/unit.">
          <TextField value={formData.pcf.ccuCarbonContent} placeholder="e.g. 0.50" readOnly={readOnly} onChange={handlePcfChange} />
        </FormField>

        <FormField name="ccuCalculationApproach" label="CCU Calculation Approach">
          <SelectField disabled={readOnly}
            defaultValue={formData.pcf.ccuCalculationApproach}
            options={CCU_APPROACH_OPTIONS}
            onValueChange={(ccuCalculationApproach) => setFormData((prev) => ({ ...prev, pcf: { ...prev.pcf, ccuCalculationApproach } }))}
          />
        </FormField>
      </FieldGrid>

      {formData.pcf.ccsTechnologicalCO2CaptureIncluded === "true" && (
        <FieldGrid columns={3}>
          <FormField name="ccsTechnologicalCO2Capture" label="CCS Tech CO₂ Capture" description="kgCO2e/unit. Must be ≤ 0.">
            <TextField value={formData.pcf.ccsTechnologicalCO2Capture} placeholder="e.g. -4.34" readOnly={readOnly} onChange={handlePcfChange} />
          </FormField>

          <FormField name="technologicalCO2Removals" label="Tech CO₂ Removals" description="kgCO2e/unit. Must be ≤ 0.">
            <TextField value={formData.pcf.technologicalCO2Removals} placeholder="e.g. -1.00" readOnly={readOnly} onChange={handlePcfChange} />
          </FormField>

          <FormField name="technologicalCO2CaptureOrigin" label="Tech CO₂ Capture Origin" description="Origin, path, and location.">
            <TextField value={formData.pcf.technologicalCO2CaptureOrigin} placeholder="Origin details" readOnly={readOnly} onChange={handlePcfChange} />
          </FormField>
        </FieldGrid>
      )}

      {formData.pcf.ccuCalculationApproach === "Credit" && (
        <FormField name="ccuCreditCertification" label="CCU Credit Certification URL" description="URL to documentation verifying certification from an external bookkeeping scheme.">
          <TextField value={formData.pcf.ccuCreditCertification} placeholder="https://..." readOnly={readOnly} onChange={handlePcfChange} />
        </FormField>
      )}

      {/* ── Methodology ── */}
      <SectionHeading>Methodology &amp; Standards</SectionHeading>

      <FieldGrid columns={3}>
        <FormField
          name="ipccCharacterizationFactors"
          label="IPCC Characterization Factors"
          required
          description="e.g. AR6"
        >
          <TextField required value={formData.pcf.ipccCharacterizationFactors} placeholder="AR6" readOnly={readOnly} onChange={handlePcfChange} />
        </FormField>

        <FormField
          name="crossSectoralStandards"
          label="Cross-Sectoral Standards"
          required
          description="e.g. ISO14067, PACT-3.0"
        >
          <TextField required value={formData.pcf.crossSectoralStandards} placeholder="ISO14067, PACT-3.0" readOnly={readOnly} onChange={handlePcfChange} />
        </FormField>

        <FormField name="exemptedEmissionsPercent" label="Exempted Emissions (%)" required>
          <TextField required value={formData.pcf.exemptedEmissionsPercent} placeholder="e.g. 5.3" readOnly={readOnly} onChange={handlePcfChange} />
        </FormField>

        <FormField name="primaryDataShare" label="Primary Data Share" description="Share of primary data in PCF value.">
          <TextField value={formData.pcf.primaryDataShare} placeholder="e.g. 60.0" readOnly={readOnly} onChange={handlePcfChange} />
        </FormField>
      </FieldGrid>

      <FormField name="exemptedEmissionsDescription" label="Exempted Emissions Description" description="Rationale behind exclusion of specific PCF emissions.">
        <TextField value={formData.pcf.exemptedEmissionsDescription} placeholder="Rationale for exclusions" readOnly={readOnly} onChange={handlePcfChange} />
      </FormField>

      <FormField name="allocationRulesDescription" label="Allocation Rules Description" description="Description of allocation rules applied to the foreground data.">
        <TextField value={formData.pcf.allocationRulesDescription} placeholder="Allocation method used" readOnly={readOnly} onChange={handlePcfChange} />
      </FormField>

      <FormField name="boundaryProcessesDescription" label="Boundary Processes Description" description="Brief description of processes included in each life cycle stage.">
        <TextField value={formData.pcf.boundaryProcessesDescription} placeholder="Manufacturing steps, technologies used, etc." readOnly={readOnly} onChange={handlePcfChange} />
      </FormField>

      {/* ── Submit ── */}
      {!readOnly && (
        <Box mt="5">
          <Form.Submit asChild>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Product Footprint"}
            </Button>
          </Form.Submit>
        </Box>
      )}
    </Form.Root>
  );
};

export default ProductFootprintForm;
