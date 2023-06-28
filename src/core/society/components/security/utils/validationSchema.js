const validationSchema = {
  addSecurity: {
    properties: {
      email: {
        format: 'email',
      },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      mobileNumber: { type: 'string', minLength: 10, maxLength: 10 },
      guardCode: { type: 'string', minLength: 6, maxLength: 6 },
      gateId: { format: 'uuid' },
    },
    required: ['guardCode', 'lastName', 'firstName', 'mobileNumber', 'gateId'],
    additionalProperties: false,
  },
  verifyGuardCode: {
    properties: {
      guardCode: { type: 'string', minLength: 6, maxLength: 6 },
    },
    required: ['guardCode'],
    additionalProperties: false,
  },
};

export default validationSchema;
