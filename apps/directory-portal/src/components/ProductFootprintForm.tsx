import React, { useState } from "react";
import { TextField as BaseTextField } from "@radix-ui/themes";
import { Button, Heading, Text, Box } from "@radix-ui/themes";
import * as Form from "@radix-ui/react-form";
import { FormField, TextField, SelectField } from "./ui";

const UNIT_OPTIONS = [
  { value: "liter", label: "Liter" },
  { value: "kilogram", label: "Kilogram" },
  { value: "cubic meter", label: "Cubic meter" },
  { value: "kilowatt hour", label: "Kilowatt hour" },
  { value: "megajoule", label: "Megajoule" },
  { value: "ton kilometer", label: "Ton kilometer" },
  { value: "square meter", label: "Square meter" },
  { value: "piece", label: "Piece" },
  { value: "hour", label: "Hour" },
  { value: "megabit second", label: "Megabit second" },
];

const STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Deprecated", label: "Deprecated" },
];

const GEOGRAPHY_REGION_OPTIONS = [
  { value: "-", label: "— None —" },
  { value: "Africa", label: "Africa" },
  { value: "Americas", label: "Americas" },
  { value: "Asia", label: "Asia" },
  { value: "Europe", label: "Europe" },
  { value: "Oceania", label: "Oceania" },
  { value: "Australia and New Zealand", label: "Australia and New Zealand" },
  { value: "Central Asia", label: "Central Asia" },
  { value: "Eastern Asia", label: "Eastern Asia" },
  { value: "Eastern Europe", label: "Eastern Europe" },
  { value: "Latin America and the Caribbean", label: "Latin America and the Caribbean" },
  { value: "Melanesia", label: "Melanesia" },
  { value: "Micronesia", label: "Micronesia" },
  { value: "Northern Africa", label: "Northern Africa" },
  { value: "Northern America", label: "Northern America" },
  { value: "Northern Europe", label: "Northern Europe" },
  { value: "Polynesia", label: "Polynesia" },
  { value: "South-eastern Asia", label: "South-eastern Asia" },
  { value: "Southern Asia", label: "Southern Asia" },
  { value: "Southern Europe", label: "Southern Europe" },
  { value: "Sub-Saharan Africa", label: "Sub-Saharan Africa" },
  { value: "Western Asia", label: "Western Asia" },
  { value: "Western Europe", label: "Western Europe" },
];

const CCU_APPROACH_OPTIONS = [
  { value: "-", label: "— None —" },
  { value: "Cut-off", label: "Cut-off" },
  { value: "Credit", label: "Credit" },
];

export interface ProductFootprintFormData {
  // ProductFootprint
  status: string;
  companyName: string;
  companyIds: string;
  productDescription: string;
  productIds: string;
  productClassifications: string;
  productNameCompany: string;
  comment: string;
  validityPeriodStart: string;
  validityPeriodEnd: string;
  // CarbonFootprint
  declaredUnitOfMeasurement: string;
  declaredUnitAmount: string;
  productMassPerDeclaredUnit: string;
  referencePeriodStart: string;
  referencePeriodEnd: string;
  geographyRegionOrSubregion: string;
  geographyCountry: string;
  geographyCountrySubdivision: string;
  boundaryProcessesDescription: string;
  pcfExcludingBiogenicUptake: string;
  pcfIncludingBiogenicUptake: string;
  fossilGhgEmissions: string;
  fossilCarbonContent: string;
  biogenicCarbonContent: string;
  recycledCarbonContent: string;
  landUseChangeGhgEmissions: string;
  landCarbonLeakage: string;
  landManagementFossilGhgEmissions: string;
  landManagementBiogenicCO2Emissions: string;
  landManagementBiogenicCO2Removals: string;
  biogenicCO2Uptake: string;
  biogenicNonCO2Emissions: string;
  landAreaOccupation: string;
  aircraftGhgEmissions: string;
  packagingEmissionsIncluded: string;
  packagingGhgEmissions: string;
  packagingBiogenicCarbonContent: string;
  outboundLogisticsGhgEmissions: string;
  ccsTechnologicalCO2CaptureIncluded: string;
  ccsTechnologicalCO2Capture: string;
  technologicalCO2CaptureOrigin: string;
  technologicalCO2Removals: string;
  ccuCarbonContent: string;
  ccuCalculationApproach: string;
  ccuCreditCertification: string;
  ipccCharacterizationFactors: string;
  crossSectoralStandards: string;
  exemptedEmissionsPercent: string;
  exemptedEmissionsDescription: string;
  allocationRulesDescription: string;
  primaryDataShare: string;
}

interface ProductFootprintFormProps {
  onSubmit?: (data: ProductFootprintFormData) => void;
  isSubmitting?: boolean;
  initialData?: Partial<ProductFootprintFormData>;
  readOnly?: boolean;
}

const INITIAL_FORM_DATA: ProductFootprintFormData = {
  status: "Active",
  companyName: "",
  companyIds: "",
  productDescription: "",
  productIds: "",
  productClassifications: "",
  productNameCompany: "",
  comment: "",
  validityPeriodStart: "",
  validityPeriodEnd: "",
  declaredUnitOfMeasurement: "kilogram",
  declaredUnitAmount: "",
  productMassPerDeclaredUnit: "",
  referencePeriodStart: "",
  referencePeriodEnd: "",
  geographyRegionOrSubregion: "",
  geographyCountry: "",
  geographyCountrySubdivision: "",
  boundaryProcessesDescription: "",
  pcfExcludingBiogenicUptake: "",
  pcfIncludingBiogenicUptake: "",
  fossilGhgEmissions: "",
  fossilCarbonContent: "",
  biogenicCarbonContent: "",
  recycledCarbonContent: "",
  landUseChangeGhgEmissions: "",
  landCarbonLeakage: "",
  landManagementFossilGhgEmissions: "",
  landManagementBiogenicCO2Emissions: "",
  landManagementBiogenicCO2Removals: "",
  biogenicCO2Uptake: "",
  biogenicNonCO2Emissions: "",
  landAreaOccupation: "",
  aircraftGhgEmissions: "",
  packagingEmissionsIncluded: "false",
  packagingGhgEmissions: "",
  packagingBiogenicCarbonContent: "",
  outboundLogisticsGhgEmissions: "",
  ccsTechnologicalCO2CaptureIncluded: "false",
  ccsTechnologicalCO2Capture: "",
  technologicalCO2CaptureOrigin: "",
  technologicalCO2Removals: "",
  ccuCarbonContent: "",
  ccuCalculationApproach: "",
  ccuCreditCertification: "",
  ipccCharacterizationFactors: "AR6",
  crossSectoralStandards: "PACT-3.0",
  exemptedEmissionsPercent: "",
  exemptedEmissionsDescription: "",
  allocationRulesDescription: "",
  primaryDataShare: "",
};

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

const ProductFootprintForm: React.FC<ProductFootprintFormProps> = ({
  onSubmit,
  isSubmitting = false,
  initialData,
  readOnly = false,
}) => {
  const [formData, setFormData] = useState<ProductFootprintFormData>({
    ...INITIAL_FORM_DATA,
    ...initialData,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!readOnly && onSubmit) {
      onSubmit(formData);
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
          required
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
        <TextField
          required
          value={formData.companyIds}
          placeholder="urn:company:example:company1"
          readOnly={readOnly} onChange={handleChange}
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
        description="Comma-separated URNs identifying the product (e.g. urn:gtin:4012345678901)."
      >
        <TextField
          required
          value={formData.productIds}
          placeholder="urn:gtin:4012345678901"
          readOnly={readOnly} onChange={handleChange}
        />
      </FormField>

      <FormField
        name="productClassifications"
        label="Product Classifications"
        description="Comma-separated classification URNs (e.g. urn:pact:productclassification:un-cpc:1234)."
      >
        <TextField
          value={formData.productClassifications}
          placeholder="urn:pact:productclassification:un-cpc:1234"
          readOnly={readOnly} onChange={handleChange}
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
            defaultValue={formData.declaredUnitOfMeasurement}
            options={UNIT_OPTIONS}
            onValueChange={(declaredUnitOfMeasurement) => setFormData((prev) => ({ ...prev, declaredUnitOfMeasurement }))}
          />
        </FormField>

        <FormField name="declaredUnitAmount" label="Declared Unit Amount" required>
          <TextField
            required
            value={formData.declaredUnitAmount}
            placeholder="e.g. 12.5"
            tooltip="The amount of units contained within the product to which the PCF refers."
            readOnly={readOnly} onChange={handleChange}
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
            value={formData.productMassPerDeclaredUnit}
            placeholder="e.g. 9.86"
            readOnly={readOnly} onChange={handleChange}
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
            value={formData.referencePeriodStart}
            tooltip="Start of the time boundary for which the PCF is representative."
            readOnly={readOnly} 
            onChange={handleChange}
          />
        </FormField>

        <FormField name="referencePeriodEnd" label="Reference Period End" required>
          <TextField
            required
            type="date"
            value={formData.referencePeriodEnd}
            tooltip="End of the time boundary for which the PCF is representative."
            readOnly={readOnly} 
            onChange={handleChange}
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
            defaultValue={formData.geographyRegionOrSubregion}
            options={GEOGRAPHY_REGION_OPTIONS}
            onValueChange={(geographyRegionOrSubregion) => setFormData((prev) => ({ ...prev, geographyRegionOrSubregion }))}
          />
        </FormField>

        <FormField name="geographyCountry" label="Country (ISO 3166-1 alpha-2)">
          <TextField
            value={formData.geographyCountry}
            placeholder="e.g. DE"
            tooltip="ISO 3166-1 alpha-2 country code."
            readOnly={readOnly} onChange={handleChange}
          />
        </FormField>

        <FormField name="geographyCountrySubdivision" label="Subdivision (ISO 3166-2)">
          <TextField
            value={formData.geographyCountrySubdivision}
            placeholder="e.g. DE-BW"
            tooltip="ISO 3166-2 country subdivision code."
            readOnly={readOnly} onChange={handleChange}
          />
        </FormField>
      </FieldGrid>

      {/* ── Carbon Footprint – Emission Values ── */}
      <SectionHeading>Emission Values</SectionHeading>

      <FieldGrid>
        <FormField name="pcfExcludingBiogenicUptake" label="PCF Excl. Biogenic Uptake" required description="kgCO2e/unit. Excl. biogenic CO₂ uptake.">
          <TextField required value={formData.pcfExcludingBiogenicUptake} placeholder="e.g. 5.14" readOnly={readOnly} onChange={handleChange} />
        </FormField>

        <FormField name="pcfIncludingBiogenicUptake" label="PCF Incl. Biogenic Uptake" required description="kgCO2e/unit. Incl. biogenic CO₂ uptake.">
          <TextField required value={formData.pcfIncludingBiogenicUptake} placeholder="e.g. -14.22" readOnly={readOnly} onChange={handleChange} />
        </FormField>
      </FieldGrid>

      <FieldGrid columns={3}>
        <FormField name="fossilGhgEmissions" label="Fossil GHG Emissions" required description="kgCO2e/unit.">
          <TextField required value={formData.fossilGhgEmissions} placeholder="e.g. 3.20" readOnly={readOnly} onChange={handleChange} />
        </FormField>

        <FormField name="fossilCarbonContent" label="Fossil Carbon Content" required description="kgC/unit.">
          <TextField required value={formData.fossilCarbonContent} placeholder="e.g. 0.50" readOnly={readOnly} onChange={handleChange} />
        </FormField>

        <FormField name="biogenicCarbonContent" label="Biogenic Carbon Content" description="kgC/unit.">
          <TextField value={formData.biogenicCarbonContent} placeholder="e.g. 0.10" readOnly={readOnly} onChange={handleChange} />
        </FormField>

        <FormField name="recycledCarbonContent" label="Recycled Carbon Content" description="kgC/unit.">
          <TextField value={formData.recycledCarbonContent} placeholder="e.g. 0.05" readOnly={readOnly} onChange={handleChange} />
        </FormField>

        <FormField name="landUseChangeGhgEmissions" label="Land Use Change GHG" description="kgCO2e/unit.">
          <TextField value={formData.landUseChangeGhgEmissions} placeholder="e.g. 0.30" readOnly={readOnly} onChange={handleChange} />
        </FormField>

        <FormField name="landCarbonLeakage" label="Land Carbon Leakage" description="kgCO2e/unit.">
          <TextField value={formData.landCarbonLeakage} placeholder="e.g. 0.00" readOnly={readOnly} onChange={handleChange} />
        </FormField>

        <FormField name="landManagementFossilGhgEmissions" label="Land Mgmt Fossil GHG" description="kgCO2e/unit.">
          <TextField value={formData.landManagementFossilGhgEmissions} placeholder="e.g. 0.10" readOnly={readOnly} onChange={handleChange} />
        </FormField>

        <FormField name="landManagementBiogenicCO2Emissions" label="Land Mgmt Biogenic CO₂" description="kgCO2e/unit.">
          <TextField value={formData.landManagementBiogenicCO2Emissions} placeholder="e.g. 0.05" readOnly={readOnly} onChange={handleChange} />
        </FormField>

        <FormField name="landManagementBiogenicCO2Removals" label="Land Mgmt Bio Removals" description="kgCO2e/unit. Must be ≤ 0.">
          <TextField value={formData.landManagementBiogenicCO2Removals} placeholder="e.g. -0.20" readOnly={readOnly} onChange={handleChange} />
        </FormField>

        <FormField name="biogenicCO2Uptake" label="Biogenic CO₂ Uptake" description="kgCO2e/unit. Must be ≤ 0.">
          <TextField value={formData.biogenicCO2Uptake} placeholder="e.g. -1.50" readOnly={readOnly} onChange={handleChange} />
        </FormField>

        <FormField name="biogenicNonCO2Emissions" label="Biogenic Non-CO₂" description="kgCO2e/unit.">
          <TextField value={formData.biogenicNonCO2Emissions} placeholder="e.g. 0.02" readOnly={readOnly} onChange={handleChange} />
        </FormField>

        <FormField name="landAreaOccupation" label="Land Area Occupation" description="m²/year per unit.">
          <TextField value={formData.landAreaOccupation} placeholder="e.g. 2.00" readOnly={readOnly} onChange={handleChange} />
        </FormField>
      </FieldGrid>

      {/* ── Transport & Packaging ── */}
      <SectionHeading>Transport &amp; Packaging</SectionHeading>

      <FieldGrid columns={3}>
        <FormField name="aircraftGhgEmissions" label="Aircraft GHG" description="kgCO2e/unit, excl. radiative forcing.">
          <TextField value={formData.aircraftGhgEmissions} placeholder="e.g. 0.15" readOnly={readOnly} onChange={handleChange} />
        </FormField>

        <FormField name="packagingEmissionsIncluded" label="Packaging Included" required>
          <SelectField disabled={readOnly}
            defaultValue={formData.packagingEmissionsIncluded}
            options={BOOLEAN_OPTIONS}
            onValueChange={(packagingEmissionsIncluded) => setFormData((prev) => ({ ...prev, packagingEmissionsIncluded }))}
          />
        </FormField>

        <FormField name="outboundLogisticsGhgEmissions" label="Outbound Logistics GHG" description="kgCO2e/unit.">
          <TextField value={formData.outboundLogisticsGhgEmissions} placeholder="e.g. 0.08" readOnly={readOnly} onChange={handleChange} />
        </FormField>
      </FieldGrid>

      {formData.packagingEmissionsIncluded === "true" && (
        <FieldGrid>
          <FormField name="packagingGhgEmissions" label="Packaging GHG Emissions" description="kgCO2e/unit.">
            <TextField value={formData.packagingGhgEmissions} placeholder="e.g. 0.30" readOnly={readOnly} onChange={handleChange} />
          </FormField>

          <FormField name="packagingBiogenicCarbonContent" label="Packaging Biogenic Carbon" description="kgC/unit.">
            <TextField value={formData.packagingBiogenicCarbonContent} placeholder="e.g. 0.01" readOnly={readOnly} onChange={handleChange} />
          </FormField>
        </FieldGrid>
      )}

      {/* ── CCS / CCU ── */}
      <SectionHeading>Carbon Capture &amp; Storage / Usage</SectionHeading>

      <FieldGrid columns={3}>
        <FormField name="ccsTechnologicalCO2CaptureIncluded" label="CCS Included" required>
          <SelectField disabled={readOnly}
            defaultValue={formData.ccsTechnologicalCO2CaptureIncluded}
            options={BOOLEAN_OPTIONS}
            onValueChange={(ccsTechnologicalCO2CaptureIncluded) => setFormData((prev) => ({ ...prev, ccsTechnologicalCO2CaptureIncluded }))}
          />
        </FormField>

        <FormField name="ccuCarbonContent" label="CCU Carbon Content" description="kgC/unit.">
          <TextField value={formData.ccuCarbonContent} placeholder="e.g. 0.50" readOnly={readOnly} onChange={handleChange} />
        </FormField>

        <FormField name="ccuCalculationApproach" label="CCU Calculation Approach">
          <SelectField disabled={readOnly}
            defaultValue={formData.ccuCalculationApproach}
            options={CCU_APPROACH_OPTIONS}
            onValueChange={(ccuCalculationApproach) => setFormData((prev) => ({ ...prev, ccuCalculationApproach }))}
          />
        </FormField>
      </FieldGrid>

      {formData.ccsTechnologicalCO2CaptureIncluded === "true" && (
        <FieldGrid columns={3}>
          <FormField name="ccsTechnologicalCO2Capture" label="CCS Tech CO₂ Capture" description="kgCO2e/unit. Must be ≤ 0.">
            <TextField value={formData.ccsTechnologicalCO2Capture} placeholder="e.g. -4.34" readOnly={readOnly} onChange={handleChange} />
          </FormField>

          <FormField name="technologicalCO2Removals" label="Tech CO₂ Removals" description="kgCO2e/unit. Must be ≤ 0.">
            <TextField value={formData.technologicalCO2Removals} placeholder="e.g. -1.00" readOnly={readOnly} onChange={handleChange} />
          </FormField>

          <FormField name="technologicalCO2CaptureOrigin" label="Tech CO₂ Capture Origin" description="Origin, path, and location.">
            <TextField value={formData.technologicalCO2CaptureOrigin} placeholder="Origin details" readOnly={readOnly} onChange={handleChange} />
          </FormField>
        </FieldGrid>
      )}

      {formData.ccuCalculationApproach === "Credit" && (
        <FormField name="ccuCreditCertification" label="CCU Credit Certification URL" description="URL to documentation verifying certification from an external bookkeeping scheme.">
          <TextField value={formData.ccuCreditCertification} placeholder="https://..." readOnly={readOnly} onChange={handleChange} />
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
          <TextField required value={formData.ipccCharacterizationFactors} placeholder="AR6" readOnly={readOnly} onChange={handleChange} />
        </FormField>

        <FormField
          name="crossSectoralStandards"
          label="Cross-Sectoral Standards"
          required
          description="e.g. ISO14067, PACT-3.0"
        >
          <TextField required value={formData.crossSectoralStandards} placeholder="ISO14067, PACT-3.0" readOnly={readOnly} onChange={handleChange} />
        </FormField>

        <FormField name="exemptedEmissionsPercent" label="Exempted Emissions (%)" required>
          <TextField required value={formData.exemptedEmissionsPercent} placeholder="e.g. 5.3" readOnly={readOnly} onChange={handleChange} />
        </FormField>

        <FormField name="primaryDataShare" label="Primary Data Share" description="Share of primary data in PCF value.">
          <TextField value={formData.primaryDataShare} placeholder="e.g. 60.0" readOnly={readOnly} onChange={handleChange} />
        </FormField>
      </FieldGrid>

      <FormField name="exemptedEmissionsDescription" label="Exempted Emissions Description" description="Rationale behind exclusion of specific PCF emissions.">
        <TextField value={formData.exemptedEmissionsDescription} placeholder="Rationale for exclusions" readOnly={readOnly} onChange={handleChange} />
      </FormField>

      <FormField name="allocationRulesDescription" label="Allocation Rules Description" description="Description of allocation rules applied to the foreground data.">
        <TextField value={formData.allocationRulesDescription} placeholder="Allocation method used" readOnly={readOnly} onChange={handleChange} />
      </FormField>

      <FormField name="boundaryProcessesDescription" label="Boundary Processes Description" description="Brief description of processes included in each life cycle stage.">
        <TextField value={formData.boundaryProcessesDescription} placeholder="Manufacturing steps, technologies used, etc." readOnly={readOnly} onChange={handleChange} />
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
