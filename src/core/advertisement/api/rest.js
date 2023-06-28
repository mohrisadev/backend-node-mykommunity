import { Router } from 'express';
import { USER_ROLES } from '../../../constants.js';
import { checkRole } from '../../../middlewares/checkRole.js';
import { KNEX, TABLES } from '../../../services/knex.js';
import { requestValidator } from '../../../utils/validator.js';
import validationSchemas from '../utils/validationSchema.js';

const router = new Router();

router.post(
  '/',
  checkRole([USER_ROLES.SUPER_ADMIN]),
  async ({ user, body }, res) => {
    try {
      requestValidator(body, validationSchemas.createAdvertisement);

      const { name, imageUrl, redirectUrl } = body;

      await KNEX(TABLES.Advertisements).insert({
        userId: user.id,
        name,
        imageUrl,
        redirectUrl,
      });

      return res.json({ success: true, message: 'Ad created successfully' });
    } catch (error) {
      console.log(`Error while creating ad: ${error.message}`);

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

router.patch(
  '/',
  checkRole([USER_ROLES.SUPER_ADMIN]),
  async ({ body }, res) => {
    try {
      requestValidator(body, validationSchemas.updateAdvertisement);

      const { advertisementId } = body;

      delete body.advertisementId;

      if (Object.keys(body).length === 0)
        throw new Error('No data provided for updation');

      const [ad] = await KNEX(TABLES.Advertisements)
        .where({
          id: advertisementId,
        })
        .limit(1);

      if (!ad) throw new Error('Invalid ad');

      await KNEX(TABLES.Advertisements)
        .where({ id: advertisementId })
        .update(body);

      return res.json({ success: true, message: 'Ad updated' });
    } catch (error) {
      console.log(`Error while updating ad: ${error.message}`);

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

router.delete(
  '/',
  checkRole([USER_ROLES.SUPER_ADMIN]),
  async ({ body }, res) => {
    try {
      requestValidator(body, validationSchemas.deleteAdvertisement);

      const { advertisementId } = body;

      const [ad] = await KNEX(TABLES.Advertisements)
        .where({
          id: advertisementId,
        })
        .limit(1);

      if (!ad) throw new Error('Invalid ad');

      await KNEX(TABLES.Advertisements).where({ id: advertisementId }).del();

      return res.json({ success: true, message: 'Ad deleted' });
    } catch (error) {
      console.log(`Error while deleting ad: ${error.message}`);

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

router.get(
  '/',
  checkRole([USER_ROLES.RESIDENT, USER_ROLES.SUPER_ADMIN]),
  async (req, res) => {
    try {
      const ads = await KNEX(TABLES.Advertisements).orderBy(
        'createdAt',
        'desc',
      );

      return res.json({ success: true, data: ads });
    } catch (error) {
      console.log(`Error while fetching ads: ${error.message}`);

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

export default router;
