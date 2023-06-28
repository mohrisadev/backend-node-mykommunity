import { VEHICLE_TYPES } from '../../../../../constants.js';

const validationSchema = {
  addVehicle: {
    properties: {
      name: {
        type: 'string',
        minLength: 1,
      },
      image: {
        format: 'uri',
      },
      number: {
        type: 'string',
      },
      type: {
        enum: Object.keys(VEHICLE_TYPES),
      },
    },
    required: ['name', 'type', 'number'],
    additionalProperties: false,
  },
};

export default validationSchema;
