import app from "./app.js";
import constants from "./constants.js";
import connectCloudinary from "./config/cloudinary.config.js";

connectCloudinary().finally(() => {
    app.listen(constants.PORT || 3500, async () => {
        console.log(`Server running on port ${constants.PORT}`);
    });
});
