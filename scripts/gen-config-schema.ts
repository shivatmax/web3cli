import fs from "fs"
import { ConfigSchema } from "../src/services/config/config.js"
import { zodToJsonSchema } from "zod-to-json-schema"

const jsonSchema = zodToJsonSchema(ConfigSchema, "Config")

fs.writeFileSync("schema.json", JSON.stringify(jsonSchema, null, 2))
