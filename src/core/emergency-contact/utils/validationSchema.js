const validationSchemas = {
  createCategory: {
    properties: {
      name: { type: 'string', minLength: 2 },
      image: { format: 'uri' },
    },
    required: ['name'],
    additionalProperties: false,
  },
  createContact: {
    properties: {
      name: { type: 'string', minLength: 2 },
      image: { format: 'uri' },
      mobileNumber: { type: 'string', minLength: 10, maxLength: 10 },
      emergencyContactCategoryId: { format: 'uuid' },
      societyId: { format: 'uuid' },
    },
    required: [
      'name',
      'mobileNumber',
      'emergencyContactCategoryId',
      'societyId',
    ],
    additionalProperties: false,
  },
  updateContact: {
    properties: {
      name: { type: 'string', minLength: 2 },
      image: { format: 'uri' },
      mobileNumber: { type: 'string', minLength: 10, maxLength: 10 },
      emergencyContactCategoryId: { format: 'uuid' },
      emergencyContactId: { format: 'uuid' },
    },
    required: ['emergencyContactId'],
    additionalProperties: false,
  },
  deleteContact: {
    properties: {
      emergencyContactId: { format: 'uuid' },
    },
    required: ['emergencyContactId'],
    additionalProperties: false,
  },
  fetchContacts: {
    properties: { societyId: { format: 'uuid' } },
    required: ['societyId'],
    additionalProperties: false,
  },
};

export default validationSchemas;
