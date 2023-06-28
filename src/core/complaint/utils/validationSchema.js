import {
  COMPLAINT_STATUS,
  COMPLAINT_SUBCATEGORIES,
  COMPLAINT_TYPES,
} from '../../../constants.js';

const validationSchemas = {
  createCategory: {
    properties: { name: { type: 'string', minLength: 1 } },
    required: ['name'],
    additionalProperties: false,
  },
  updateCategory: {
    properties: {
      name: { type: 'string', minLength: 1 },
      categoryId: { format: 'uuid' },
    },
    required: ['name', 'categoryId'],
    additionalProperties: false,
  },
  createComplaint: {
    properties: {
      categoryId: {
        format: 'uuid',
      },
      subCategory: {
        type: 'string',
        minLength: 1,
        errorMessage: 'Invalid sub-category provided',
        enum: [...Object.keys(COMPLAINT_SUBCATEGORIES)],
      },
      type: {
        type: 'string',
        minLength: 1,
        errorMessage: 'Invalid type provided',
        enum: [...Object.keys(COMPLAINT_TYPES)],
      },
      message: {
        type: 'string',
        minLength: 1,
        errorMessage: 'Invalid message provided',
      },
      image: {
        format: 'uri',
      },
      societyId: {
        format: 'uuid',
        errorMessage: 'Invalid society id',
      },
      rentalUnitId: {
        format: 'uuid',
        errorMessage: 'Invalid rental unit id',
      },
    },
    required: [
      'categoryId',
      'subCategory',
      'type',
      'message',
      'societyId',
      'rentalUnitId',
    ],
    additionalProperties: false,
  },
  createComment: {
    properties: {
      comment: {
        type: 'string',
        minLength: 1,
        errorMessage: 'Invalid comment',
      },
      complaintId: {
        format: 'uuid',
        errorMessage: 'Invalid rental unit id',
      },
      photoUrl: {
        format: 'uri',
      },
    },
    required: ['comment', 'complaintId'],
    additionalProperties: false,
  },
  resolveComplaint: {
    properties: {
      complaintId: {
        format: 'uuid',
      },
      comment: {
        type: 'string',
        minLength: 1,
      },
      rating: {
        type: 'number',
        minimum: 1,
        maximum: 5,
      },
    },
    required: ['complaintId'],
    additionalProperties: false,
  },
  fetchComplaint: {
    properties: {
      category: {
        type: 'string',
        errorMessage: 'Invalid category provided',
      },
      type: {
        type: 'string',
        minLength: 1,
        errorMessage: 'Invalid type provided',
        enum: [...Object.keys(COMPLAINT_TYPES)],
      },
      status: {
        type: 'string',
        minLength: 1,
        errorMessage: 'Invalid status provided',
        enum: [...Object.keys(COMPLAINT_STATUS)],
      },
    },
    additionalProperties: false,
  },
  updateStatus: {
    properties: {
      status: {
        type: 'string',
        minLength: 1,
        errorMessage: 'Invalid status provided',
        enum: [...Object.keys(COMPLAINT_STATUS)],
      },
      complaintId: {
        format: 'uuid',
        errorMessage: 'Invalid rental unit id',
      },
    },
  },
};

export default validationSchemas;
