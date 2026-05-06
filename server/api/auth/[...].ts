import { fromWebHandler } from "nitro/h3"
import { auth } from "../../../src/lib/auth"

export default fromWebHandler((request) => auth.handler(request))
