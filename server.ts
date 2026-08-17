import type { BbPluginApi } from "@get-bb/plugin-sdk";

export default function plugin(bb: BbPluginApi) {
  bb.log.info("loaded");

  bb.onDispose(() => {
    bb.log.info("disposed");
  });
}
