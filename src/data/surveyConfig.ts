export type SurveyField = {
  name: string;
  label: string;
  type: "number" | "text" | "select" | "textarea";
  required?: boolean;
  placeholder?: string;
  min?: number;
  options?: string[];
};

export type SurveyCategory = {
  value: string;
  label: string;
  fields: SurveyField[];
};

/**
 * Category-specific questions for citizen reports.  Keep new categories and
 * fields here so the report form stays a generic renderer.
 */
export const surveyCategories: SurveyCategory[] = [
  {
    value: "Medical",
    label: "Medical",
    fields: [
      { name: "injured", label: "Number of injured", type: "number", min: 0, required: true, placeholder: "e.g. 4" },
      { name: "casualties", label: "Number of casualties", type: "number", min: 0, placeholder: "e.g. 0" },
      { name: "medicalSupplies", label: "Medical supplies needed", type: "text", required: true, placeholder: "e.g. bandages, insulin" },
      { name: "peopleAffected", label: "Number of people affected", type: "number", min: 1, required: true, placeholder: "e.g. 10" },
    ],
  },
  {
    value: "Food",
    label: "Food",
    fields: [
      { name: "foodType", label: "Food type", type: "text", required: true, placeholder: "e.g. dry food" },
      { name: "quantity", label: "Quantity required", type: "number", min: 1, required: true, placeholder: "e.g. 50" },
      { name: "unit", label: "Unit", type: "select", required: true, options: ["Meals", "Packets", "Kg", "Other"] },
      { name: "peopleToServe", label: "Number of people to serve", type: "number", min: 1, required: true, placeholder: "e.g. 25" },
    ],
  },
  {
    value: "Water",
    label: "Water",
    fields: [
      { name: "quantity", label: "Quantity required", type: "number", min: 1, required: true, placeholder: "e.g. 100" },
      { name: "unit", label: "Unit", type: "select", required: true, options: ["Litres", "Bottles", "Gallons", "Other"] },
      { name: "peopleNeedingWater", label: "Number of people needing water", type: "number", min: 1, required: true, placeholder: "e.g. 30" },
    ],
  },
  {
    value: "Shelter",
    label: "Shelter",
    fields: [
      { name: "people", label: "Number of people", type: "number", min: 1, required: true, placeholder: "e.g. 12" },
      { name: "duration", label: "Required duration", type: "text", required: true, placeholder: "e.g. 3 nights" },
      { name: "specialRequirements", label: "Special requirements", type: "textarea", placeholder: "e.g. wheelchair access" },
    ],
  },
  {
    value: "Rescue",
    label: "Rescue",
    fields: [
      { name: "peopleTrapped", label: "Number of people trapped", type: "number", min: 1, required: true, placeholder: "e.g. 3" },
      { name: "rescueType", label: "Rescue type", type: "select", required: true, options: ["Flood rescue", "Fire rescue", "Collapsed structure", "Other"] },
    ],
  },
  {
    value: "Evacuation",
    label: "Evacuation",
    fields: [
      { name: "people", label: "Number of people", type: "number", min: 1, required: true, placeholder: "e.g. 8" },
      { name: "transportNeeded", label: "Transport needed", type: "select", required: true, options: ["Ambulance", "Boat", "Bus", "Vehicle", "Other"] },
    ],
  },
  {
    value: "Clothing",
    label: "Clothing",
    fields: [
      { name: "quantity", label: "Quantity required", type: "number", min: 1, required: true, placeholder: "e.g. 20" },
      { name: "sizesRequirements", label: "Sizes or requirements", type: "textarea", required: true, placeholder: "e.g. children sizes, warm clothing" },
    ],
  },
  {
    value: "Other",
    label: "Other",
    fields: [
      { name: "resourceDetails", label: "Resource details", type: "textarea", required: true, placeholder: "Describe the resource or assistance needed" },
    ],
  },
];

export const getSurveyCategory = (value: string) =>
  surveyCategories.find((category) => category.value === value);
