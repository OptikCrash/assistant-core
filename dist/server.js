"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const audit_1 = require("./routes/audit");
const chat_1 = require("./routes/chat");
const execute_1 = require("./routes/execute");
const review_1 = require("./routes/review");
const reviewSmart_1 = require("./routes/reviewSmart");
const workspace_1 = require("./routes/workspace");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/chat', chat_1.chatRouter);
app.use('/api/execute', execute_1.executeRouter);
app.use('/api/audit', audit_1.auditRouter);
app.use('/api/review', review_1.reviewRouter);
app.use('/api/review-smart', reviewSmart_1.reviewSmartRouter);
app.use('/api/workspace', workspace_1.workspaceRouter);
const PORT = 1339;
app.listen(PORT, () => {
    console.log(`Assistant core running on http://localhost:${PORT}`);
});
