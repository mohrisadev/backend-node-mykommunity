import { Router } from 'express';
import {
  REQUEST_VALIDATOR_MODIFICATIONS,
  USER_ROLES,
} from '../../../../../constants.js';
import { checkRole } from '../../../../../middlewares/checkRole.js';
import { KNEX, TABLES } from '../../../../../services/knex.js';
import { sanitizeAndValidateRequest } from '../../../../../utils/sanitize.js';
import validationSchema from '../utils/validationSchema.js';

const router = Router();

router.post(
  '/',
  checkRole([USER_ROLES.SOCIETY_ADMIN]),
  async ({ body, user }, res) => {
    try {
      sanitizeAndValidateRequest(body, validationSchema.createGate, {
        BEFORE_VALIDATION: {
          name: [
            REQUEST_VALIDATOR_MODIFICATIONS.TRIM,
            REQUEST_VALIDATOR_MODIFICATIONS.UPPERCASE,
          ],
        },
      });

      const { name } = body;

      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({ userId: user.id, role: USER_ROLES.SOCIETY_ADMIN })
        .select('societyId')
        .limit(1);

      if (!userRole?.societyId) {
        throw new Error('User not associated with society');
      }

      // check if gate with same name already exists
      const [gateExists] = await KNEX(TABLES.Gates)
        .where({
          societyId: userRole?.societyId,
          name,
        })
        .limit(1);

      if (gateExists) {
        throw new Error('Gate with same name already exists');
      }

      await KNEX(TABLES.Gates).insert({ name, societyId: userRole?.societyId });

      return res.json({ success: true, message: 'Gate created successfully' });
    } catch (error) {
      console.log(`Error while creating gate: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
);

router.patch(
  '/',
  checkRole([USER_ROLES.SOCIETY_ADMIN]),
  async ({ body, user }, res) => {
    try {
      sanitizeAndValidateRequest(body, validationSchema.updateGate, {
        BEFORE_VALIDATION: {
          name: [
            REQUEST_VALIDATOR_MODIFICATIONS.TRIM,
            REQUEST_VALIDATOR_MODIFICATIONS.UPPERCASE,
          ],
        },
      });

      const { name, gateId } = body;

      const [gate] = await KNEX(TABLES.Gates).where({ id: gateId }).limit(1);

      if (!gate) throw new Error(`Invalid gate`);

      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({ userId: user.id, role: USER_ROLES.SOCIETY_ADMIN })
        .select('societyId')
        .limit(1);

      if (userRole?.societyId !== gate.societyId) {
        throw new Error('User not associated with society');
      }

      // check if gate with same name already exists
      const [gateExists] = await KNEX(TABLES.Gates)
        .where({
          societyId: userRole?.societyId,
          name,
        })
        .limit(1);

      if (gateExists) {
        throw new Error('Gate with same name already exists');
      }

      await KNEX(TABLES.Gates).where({ id: gateId }).update({ name });

      return res.json({ success: true, message: 'Gate updated successfully' });
    } catch (error) {
      console.log(`Error while updating gate: ${error.message}`);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
);

router.get('/', async ({ user }, res) => {
  try {
    const [userRole] = await KNEX(TABLES.UserRoles)
      .where({ userId: user.id })
      .whereNotNull('societyId');

    if (!userRole?.societyId) {
      throw new Error('User not linked to any society');
    }

    const gates = await KNEX(TABLES.Gates).where({
      societyId: userRole.societyId,
    });

    return res.json({ success: true, data: gates });
  } catch (error) {
    console.log(`Error while fetching gate: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
