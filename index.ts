import dotenv from "dotenv";
dotenv.config();
import bot from "./bot";
import rmqManager from "./amqp";
import { addDefaultToken } from "./services/token-paymaster";

async function main() {
    // bot
    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));
    bot.launch();

    await rmqManager.init();
    console.log("RMQ is ready");
    addDefaultToken();
}
process.on("SIGINT", function () {
    console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");
    process.exit(0);
});

main();
