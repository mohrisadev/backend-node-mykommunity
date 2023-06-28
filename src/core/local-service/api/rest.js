import { Router } from 'express';
import { USER_ROLES } from '../../../constants.js';
import { checkRole } from '../../../middlewares/checkRole.js';
import { KNEX, TABLES } from '../../../services/knex.js';
import { requestValidator } from '../../../utils/validator.js';
import validationSchemas from '../utils/validationSchema.js';

const router = Router();

router.post(
  '/',
  checkRole([USER_ROLES.SOCIETY_ADMIN, USER_ROLES.SUPER_ADMIN]),
  async (req, res) => {
    try {
      requestValidator(req.body, validationSchemas.createLocalService);

      let { name, image = null } = req.body;

      name = name.toUpperCase();

      const [localService] = await KNEX(TABLES.LocalServices).where({ name });

      if (localService) throw Error('Category already present');

      await KNEX(TABLES.LocalServices).insert({ name, image });

      return res.json({
        success: true,
        message: 'Local service category created successfully',
      });
    } catch (error) {
      console.log(`Error in POST /local-services: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

// to update category related information
router.patch(
  '/',
  checkRole([USER_ROLES.SOCIETY_ADMIN, USER_ROLES.SUPER_ADMIN]),
  async (req, res) => {
    try {
      requestValidator(req.body, validationSchemas.updateLocalService);

      let { localServiceId, name, image = null } = req.body;

      if (!name && !image) {
        throw new Error('No data provided for updation');
      }

      if (name) name = name.toUpperCase();

      const [exitingLocalService] = await KNEX(TABLES.LocalServices)
        .where({
          id: localServiceId,
        })
        .limit(1);

      if (!exitingLocalService) throw new Error('Invalid local service id');

      if (name) {
        const [isNameTaken] = await KNEX(TABLES.LocalServices)
          .where({ name })
          .limit(1);

        if (isNameTaken) throw new Error('Category name is taken');
      }

      const localServiceUpdateData = {};

      if (name) localServiceUpdateData['name'] = name;
      if (image) localServiceUpdateData['image'] = image;

      await KNEX(TABLES.LocalServices)
        .where({ id: localServiceId })
        .update(localServiceUpdateData);

      return res.json({
        success: true,
        message: 'Local service category updated successfully',
      });
    } catch (error) {
      console.log(`Error in updating local-services: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

router.get('/', async (req, res) => {
  try {
    const localServices = await KNEX(TABLES.LocalServices);

    return res.json({ success: true, data: localServices });
  } catch (error) {
    console.log(`Error in GET /local-services: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
