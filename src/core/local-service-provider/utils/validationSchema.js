import { LOCAL_SERVICE_PROVIDER_ATTENDANCE_STATUS } from '../../../constants.js';

const validationSchemas = {
  createLocalServiceProvider: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        errorMessage: 'Invalid name provided',
      },
      localServiceId: {
        format: 'uuid',
        errorMessage: 'Invalid local service id',
      },
      societyId: {
        format: 'uuid',
        errorMessage: 'Invalid society id',
      },
      mobileNumber: {
        type: 'string',
        pattern: '[0-9]{10}',
        minLength: 10,
        maxLength: 10,
        errorMessage: 'Invalid mobile number',
      },
      image: {
        format: 'uri',
      },
      localServiceProviderCode: {
        type: 'string',
        pattern: '[0-9]+',
        minLength: 6,
        maxLength: 6,
        errorMessage: 'local service provider code invalid',
      },
    },
    required: [
      'name',
      'localServiceId',
      'mobileNumber',
      'societyId',
      'localServiceProviderCode',
    ],
    additionalProperties: false,
  },
  updateLocalServiceProvider: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        errorMessage: 'Invalid name provided',
      },
      localServiceId: {
        format: 'uuid',
        errorMessage: 'Invalid local service id',
      },
      mobileNumber: {
        type: 'string',
        pattern: '[0-9]{10}',
        minLength: 10,
        maxLength: 10,
        errorMessage: 'Invalid mobile number',
      },
      image: {
        format: 'uri',
      },
      localServiceProviderId: {
        format: 'uuid',
      },
    },
    required: ['localServiceProviderId'],
    additionalProperties: false,
  },
  localServiceProviderHirirng: {
    properties: {
      localServiceProviderId: {
        minLength: 1,
        format: 'uuid',
        type: 'string',
      },
    },
    required: ['localServiceProviderId'],
    additionalProperties: false,
  },
  localServiceProviderFiring: {
    properties: {
      localServiceProviderAndRentalUnitId: {
        minLength: 1,
        format: 'uuid',
        type: 'string',
      },
      reason: {
        type: 'string',
        minLength: 1,
      },
    },
    required: ['localServiceProviderAndRentalUnitId', 'reason'],
    additionalProperties: false,
  },
  localServiceProviderAttendance: {
    properties: {
      localServiceProviderId: {
        minLength: 1,
        format: 'uuid',
        type: 'string',
      },
      rentalUnitId: {
        minLength: 1,
        format: 'uuid',
        type: 'string',
      },
      status: {
        type: 'string',
        enum: [...Object.keys(LOCAL_SERVICE_PROVIDER_ATTENDANCE_STATUS)],
      },
    },
    required: ['localServiceProviderId', 'rentalUnitId', 'status'],
    additionalProperties: false,
  },
  localServiceProviderRating: {
    properties: {
      ratings: {
        type: 'object',
      },
      localServiceProviderId: { format: 'uuid' },
      rentalUnitId: { format: 'uuid' },
    },
    required: ['localServiceProviderId', 'rentalUnitId', 'ratings'],
  },
  fetchAttendance: {
    properties: {
      id: { format: 'uuid' },
    },
    required: ['id'],
    additionalProperties: false,
  },
};

export default validationSchemas;
