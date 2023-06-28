const validationSchemas = {
  createLocalService: {
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        errorMessage: 'Invalid name provided',
      },
      image: {
        format: 'uri',
      },
    },
    required: ['name'],
    additionalProperties: false,
  },
  updateLocalService: {
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        errorMessage: 'Invalid name provided',
      },
      image: {
        format: 'uri',
      },
      localServiceId: {
        format: 'uuid',
      },
    },
    required: ['localServiceId'],
    additionalProperties: false,
  },
};

export default validationSchemas;
