// import { SOS_TYPES } from '../../../constants.js';

const validationSchemas = {
  createSosCategory: {
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
  updateSosCategory: {
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        errorMessage: 'Invalid name provided',
      },
      image: {
        format: 'uri',
      },
      sosCategoryId: {
        format: 'uuid',
      },
    },
    required: ['sosCategoryId'],
    additionalProperties: false,
  },
  createSos: {
    properties: {
      sosCategoryId: { format: 'uuid' },
    },
    required: ['sosCategoryId'],
    additionalProperties: false,
  },
  acknowledgeSOS: {
    properties: {
      sosId: { format: 'uuid' },
    },
    required: ['sosId'],
    additionalProperties: false,
  },
  resolveSOS: {
    properties: {
      sosId: { format: 'uuid' },
    },
    required: ['sosId'],
    additionalProperties: false,
  },
  fetchSecuritySOS: {
    properties: {
      isAcknowledged: { type: 'string', enum: ['true', 'false'] },
    },
    additionalProperties: false,
  },
};

export default validationSchemas;
