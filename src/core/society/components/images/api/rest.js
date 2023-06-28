import { Router } from 'express';
import { KNEX, TABLES } from '../../../../../services/knex.js';
import { requestValidator } from '../../../../../utils/validator.js';
import validationSchemas from '../utils/validationSchema.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    requestValidator(req.body, validationSchemas.addImages);

    const { images, societyId } = req.body;

    const [society] = await KNEX(TABLES.Societies).where({ id: societyId });

    if (!society) {
      return res
        .status(404)
        .json({ success: false, message: 'Society not found' });
    }

    const imagesData = images.map((image) => {
      return { image: image.trim(), societyId };
    });

    await KNEX(TABLES.SocietyImages).insert(imagesData);

    return res.json({ success: true, message: 'Images added successfully' });
  } catch (error) {
    console.log(`Error in adding images for society: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await KNEX(TABLES.SocietyImages).where({ id }).del();

    return res.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    console.log(`Error in deleting images for society: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
