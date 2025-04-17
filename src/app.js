import express from "express";
const app = express();
import constants from "./constants.js";
import cors from "cors";
import morgan from "morgan";
import errorMiddleware from "./middlewares/error.middleware.js";
import videoRoutes from "./routes/v1/video.routes.js";

app.use(express.json());
app.use(
    express.urlencoded({
        extended: true,
    })
);
app.use(
    cors({
        origin: constants.FRONTEND_URL,
    })
);
app.use(express.static("public"));
app.use(morgan("dev"));

app.use("/api/v1/videos", videoRoutes);
app.all("*", (req, res) => {
    res.status(404).json({
        success: false,
        message: "Page not found",
    });
});

app.use(errorMiddleware);

export default app;
