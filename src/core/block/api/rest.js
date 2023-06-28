import { Router } from 'express';
import validationSchemas from '../utils/validationSchema.js';
import { requestValidator } from '../../../utils/validator.js';
import { sanitizeAndValidateRequest } from '../../../utils/sanitize.js';
import { KNEX, TABLES } from '../../../services/knex.js';
import { checkRole } from '../../../middlewares/checkRole.js';
import {
  REQUEST_VALIDATOR_MODIFICATIONS,
  USER_ROLES,
} from '../../../constants.js';

const router = Router();

// Create a block in a society
router.post(
  '/',
  checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.SOCIETY_ADMIN]),
  async (req, res) => {
    try {
      sanitizeAndValidateRequest(req.body, validationSchemas.createBlock, {
        BEFORE_VALIDATION: {
          name: [
            REQUEST_VALIDATOR_MODIFICATIONS.TRIM,
            REQUEST_VALIDATOR_MODIFICATIONS.UPPERCASE,
          ],
        },
      });

      const { societyId, name } = req.body;

      const [block] = await KNEX(TABLES.Blocks).where({ name, societyId });

      if (block) {
        return res.status(400).json({
          success: false,
          message: 'Block already exists in the society',
        });
      }

      await KNEX(TABLES.Blocks).insert({ name, societyId });

      return res.json({
        success: true,
        message: 'Block inserted successfully',
      });
    } catch (error) {
      console.log(`Error in creating block: ${error.message}`);
      return res.json({ success: false, message: error.message });
    }
  },
);

// Get all blocks in a society
router.get('/', async (req, res) => {
  try {
    requestValidator(req.query, validationSchemas.getBlocksBySocietyId);

    const { societyId } = req.query;

    const blocks = await KNEX(TABLES.Blocks)
      .where({ societyId })
      .orderBy('name', 'asc');

    return res.json({ success: true, data: blocks });
  } catch (error) {
    console.log(`Unable to fetch blocks: ${error.message}`);
    return res.json({ success: false, message: error.message });
  }
});

// Update name or society for a block
router.post(
  '/update',
  checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.SOCIETY_ADMIN]),
  async (req, res) => {
    try {
      requestValidator(req.body, validationSchemas.updateBlock);

      const { id, societyId, name } = req.body;

      const blockWithGivenIdPromise = KNEX(TABLES.Blocks).where({ id });
      const blockWithGivenNameAndSocietyPromise = KNEX(TABLES.Blocks)
        .where({
          name,
          societyId,
        })
        .andWhereNot({ id });

      const [[blockWithGivenId], [blockWithGivenNameAndSociety]] =
        await Promise.all([
          blockWithGivenIdPromise,
          blockWithGivenNameAndSocietyPromise,
        ]);

      if (!blockWithGivenId) {
        return res.status(404).json({
          success: false,
          message: 'Block not found',
        });
      } else if (blockWithGivenNameAndSociety) {
        return res.status(400).json({
          success: false,
          message: 'Block name already exists in Society',
        });
      }

      await KNEX(TABLES.Blocks).update({ name, societyId }).where({ id });

      return res.json({ success: true, message: 'Block updated successfully' });
    } catch (error) {
      console.log(`Error while updating block: ${error.message}`);
      return res.json({ success: false, message: error.message });
    }
  },
);

// Disable a block
router.post('/disable', checkRole(USER_ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    requestValidator(req.body, validationSchemas.enableOrDisableBlock);

    const { id } = req.body;

    const [blockWithGivenId] = await KNEX(TABLES.Blocks).where({
      id,
      disabled: false,
    });

    if (!blockWithGivenId) {
      return res.status(404).json({
        success: false,
        message: 'Block not found',
      });
    }

    await KNEX(TABLES.Blocks).update({ disabled: true }).where({ id });

    return res.json({ success: true, message: 'Block disabled successfully' });
  } catch (error) {
    console.log(`Error while disabling block: ${error.message}`);
    return res.json({ success: false, message: error.message });
  }
});

// Enable a block
router.post('/enable', checkRole(USER_ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    requestValidator(req.body, validationSchemas.enableOrDisableBlock);

    const { id } = req.body;

    const [blockWithGivenId] = await KNEX(TABLES.Blocks).where({
      id,
      disabled: true,
    });

    if (!blockWithGivenId) {
      return res.status(404).json({
        success: false,
        message: 'Block not found',
      });
    }

    await KNEX(TABLES.Blocks).update({ disabled: false }).where({ id });

    return res.json({ success: true, message: 'BLock enabled successfully' });
  } catch (error) {
    console.log(`Error while enabling block: ${error.message}`);
    return res.json({ success: false, message: error.message });
  }
});

export default router;
