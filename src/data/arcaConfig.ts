/**
 * src/data/arcaConfig.ts
 *
 * Configuracion oficial de ARCA (Produccion Monotributo - Punto de Venta 2)
 * Restaurante El Patron / Bella Oriana - CUIT 27426946136
 */

export interface ArcaConfigRow {
  idx: number;
  id: string;
  cuit: string;
  punto_venta: number;
  environment: string;
  tax_profile: string;
  secret_ciphertext: string;
  secret_iv: string;
  secret_tag: string;
  certificate_subject: string;
  certificate_serial: string;
  certificate_valid_from: string;
  certificate_valid_to: string;
  updated_by: string;
  updated_at: string;
  legal_name: string;
  trade_name: string;
  commercial_address: string;
  gross_income_number: string;
  activity_start_date: string;
}

export const OFFICIAL_ARCA_CONFIG: ArcaConfigRow = {
  "idx": 0,
  "id": "primary",
  "cuit": "27426946136",
  "punto_venta": 2,
  "environment": "produccion",
  "tax_profile": "monotributo",
  "secret_ciphertext": "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",
  "secret_iv": "7imeeyyeFMeUdjgs",
  "secret_tag": "ZVqtHooqOVMfmmV3oR7iww==",
  "certificate_subject": "CN=restaurante-potro-prod-v2, serialNumber=CUIT 27426946136",
  "certificate_serial": "7868692834118efb",
  "certificate_valid_from": "2026-07-14 17:31:19+00",
  "certificate_valid_to": "2028-07-13 17:31:19+00",
  "updated_by": "0347c66a-ad5c-43e7-828b-f743de7c2a21",
  "updated_at": "2026-07-22 02:20:47.551+00",
  "legal_name": "BELLA ORIANA",
  "trade_name": "El Patron",
  "commercial_address": "FOTHERINGHAM 33, CP 5800, RIO CUARTO, CORDOBA",
  "gross_income_number": "289734805",
  "activity_start_date": "2026-06-01"
};

export const ARCA_CONFIG_COLUMNS: Array<keyof ArcaConfigRow> = [
  "idx",
  "id",
  "cuit",
  "punto_venta",
  "environment",
  "tax_profile",
  "secret_ciphertext",
  "secret_iv",
  "secret_tag",
  "certificate_subject",
  "certificate_serial",
  "certificate_valid_from",
  "certificate_valid_to",
  "updated_by",
  "updated_at",
  "legal_name",
  "trade_name",
  "commercial_address",
  "gross_income_number",
  "activity_start_date"
];
