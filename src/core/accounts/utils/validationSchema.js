const validationSchemas = {
  createAccount: {
    properties: {
      accountNumber: { type: 'string' },
      bankName: { type: 'string' },
      ifscCode: { type: 'string' },
      accountHolderName: { type: 'string' },
    },
    required: ['accountNumber','bankName', 'ifscCode', 'accountHolderName'],
    additionalProperties: false,
  },
  updateAccount: {
    properties: {
      accountNumber: { type: 'string' },
      bankName: { type: 'string' },
      ifscCode: { type: 'string' },
      accountHolderName: { type: 'string' },
    },
    required: ['accountNumber','bankName', 'ifscCode', 'accountHolderName'],
    additionalProperties: false,
  },
  enableOrDisableAccount: {
    properties: {
      accountNumber: { format: 'string' },
    },
    required: ['accountNumber'],
    additionalProperties: false,
  },
};

export default validationSchemas;
