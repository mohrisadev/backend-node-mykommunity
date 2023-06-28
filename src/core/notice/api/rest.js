import { Router } from 'express';
import { USER_ROLES } from '../../../constants.js';
import { checkRole } from '../../../middlewares/checkRole.js';
import { KNEX, TABLES } from '../../../services/knex.js';
import { requestValidator } from '../../../utils/validator.js';
import validationSchemas from '../utils/validationSchema.js';
import { sendNotificationToSocietyResidents } from '../../../utils/helpers.js';

const router = Router();

router.post(
  '/',
  checkRole([USER_ROLES.SOCIETY_ADMIN]),
  async ({ body, user }, res) => {
    try {
      requestValidator(body, validationSchemas.createNotice);

      const { title, description, image } = body;

      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({
          userId: user.id,
          role: USER_ROLES.SOCIETY_ADMIN,
        })
        .select('societyId')
        .limit(1);

      if (!userRole?.societyId) throw Error('No society found for user');

      await KNEX(TABLES.Notices).insert({
        userId: user.id,
        societyId: userRole?.societyId,
        title,
        description,
        image,
      });

      await sendNotificationToSocietyResidents({
        societyId: userRole?.societyId,
        title: 'New Notice',
        message: title,
      });

      return res.json({
        success: true,
        message: 'Notice created successfully',
      });
    } catch (error) {
      console.log(`Error in creating notice: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  },
);

router.patch(
  '/',
  checkRole([USER_ROLES.SOCIETY_ADMIN]),
  async ({ body, user }, res) => {
    try {
      requestValidator(body, validationSchemas.updateNotice);

      const { noticeId, title, description, image } = body;

      if (!title && !description && !image) {
        throw new Error('No data for updation');
      }

      const [notice] = await KNEX(TABLES.Notices)
        .where({ id: noticeId })
        .limit(1);

      if (!notice) throw new Error('Invalid notice');

      // check if user has access to society
      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({ userId: user.id, role: USER_ROLES.SOCIETY_ADMIN })
        .limit(1)
        .select('societyId');

      if (userRole?.societyId !== notice?.societyId)
        throw Error('Invalid permission for selected notice');

      delete body.noticeId;

      await KNEX(TABLES.Notices).where({ id: noticeId }).update(body);

      return res.json({
        success: true,
        message: 'Notice updated successfully',
      });
    } catch (error) {
      console.log(`Error in updating notice: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  },
);

// fetches notices of the required society only
router.get('/', async ({ user }, res) => {
  try {
    const [userRole] = await KNEX(TABLES.UserRoles)
      .where({ userId: user.id })
      .whereNotNull('societyId')
      .limit(1)
      .select('societyId');

    if (!userRole?.societyId) throw new Error('No linked society found');

    const notices = await KNEX(TABLES.Notices).where({
      societyId: userRole.societyId,
    });

    return res.json({ success: true, data: notices });
  } catch (error) {
    console.log(`Error in fetching notice: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.delete(
  '/',
  checkRole([USER_ROLES.SOCIETY_ADMIN]),
  async ({ body, user }, res) => {
    try {
      requestValidator(body, validationSchemas.updateNotice);

      const { noticeId } = body;

      const [notice] = await KNEX(TABLES.Notices)
        .where({ id: noticeId })
        .limit(1);

      if (!notice) throw new Error('Invalid notice');

      // check if user has access to society
      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({ userId: user.id, role: USER_ROLES.SOCIETY_ADMIN })
        .limit(1)
        .select('societyId');

      if (userRole?.societyId !== notice?.societyId)
        throw Error('Invalid permission for selected notice');

      await KNEX(TABLES.Notices).where({ id: noticeId }).delete();

      return res.json({
        success: true,
        message: 'Notice deleted successfully',
      });
    } catch (error) {
      console.log(`Error in deleting notice: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  },
);

export default router;
