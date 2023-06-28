const validationSchemas = {
  createGeneralLedger : {
    properties: {
      generalLedgerName: { type: 'string' },
      subCatagory: { type: 'string' },
      id: { type: 'uuid' },
    },
    required: ['generalLedgerName','subCatagory', 'id'],
    additionalProperties: false,
  },
  updateGeneralLedger : {
    properties: {
      generalLedgerName: { type: 'string' },
      subCatagory: { type: 'string' },
      id: { type: 'uuid' },
    },
    required: ['generalLedgerName','subCatagory', 'id'],
    additionalProperties: false,
  },
  enableOrDisableGeneralLedger : {
    properties: {
      id: { format: 'uuid' },
    },
    required: ['id'],
    additionalProperties: false,
  },
};

export default validationSchemas;
