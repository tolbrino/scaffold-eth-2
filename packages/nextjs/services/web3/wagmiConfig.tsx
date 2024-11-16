import { wagmiConnectors } from "./wagmiConnectors";
import { Routing } from "@hoprnet/uhttp-lib";
import { Chain, createClient, custom, fallback, http } from "viem";
import { hardhat, mainnet } from "viem/chains";
import { createConfig } from "wagmi";
import scaffoldConfig from "~~/scaffold.config";
import { getAlchemyHttpUrl } from "~~/utils/scaffold-eth";

const { targetNetworks, usePrivateRpc, pollingInterval, uhttpClientId } = scaffoldConfig;
const router = new Routing.Client(uhttpClientId, { forceZeroHop: true, clientAssociatedExitNodes: true });

// We always want to have mainnet enabled (ENS resolution, ETH price, etc). But only once.
export const enabledChains = targetNetworks.find((network: Chain) => network.id === 1)
  ? targetNetworks
  : ([...targetNetworks, mainnet] as const);

export const wagmiConfig = createConfig({
  chains: enabledChains,
  connectors: wagmiConnectors,
  ssr: true,
  client({ chain }) {
    const isHardhat = chain.id === (hardhat as Chain).id;
    const alchemyHttpUrl = getAlchemyHttpUrl(chain.id);
    const httpTransport = http();
    const rpcFallbacks = alchemyHttpUrl ? [http(alchemyHttpUrl), httpTransport] : [httpTransport];

    // The plain transport is used when usePrivateRpc is false
    const fallbackTransport = fallback(rpcFallbacks);

    const provider = alchemyHttpUrl || chain?.rpcUrls.default.http[0];

    console.log(`CHAIN: ${chain.id}`);
    console.log(`ALCHEMY HTTP URL: ${alchemyHttpUrl}`);
    console.log(`USE PRIVATE RPC: ${usePrivateRpc}`);
    console.log(`UHTTP CLIENT ID: ${uhttpClientId}`);
    console.log(`CLIENT PROVIDER: ${provider}`);
    console.log(`isHardhat: ${isHardhat}`);

    // The custom private transport is used when usePrivateRpc is true
    const customTransport = custom({
      async request(req) {
        try {
          console.log("PRIVATE RPC REQUEST:", provider, req);
          const response = await router.fetch(provider, {
            body: JSON.stringify(req),
            method: "POST",
          });
          console.log("PRIVATE RPC RESPONSE:", response);

          if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
          }

          const json = await response.json();
          console.log("PRIVATE RPC RESPONSE:", json);

          return "error" in json ? json.error : json.result;
        } catch (e: any) {
          console.error("PRIVATE RPC ERROR:", e);
        }
      },
    });

    // The custom private transport may only be used when using a publicly
    // reachable RPC endpoint.
    const transport = usePrivateRpc && !isHardhat ? customTransport : fallbackTransport;

    return createClient({
      chain,
      transport,
      ...(!isHardhat ? { pollingInterval } : {}),
    });
  },
});
