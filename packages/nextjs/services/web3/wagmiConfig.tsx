import { wagmiConnectors } from "./wagmiConnectors";
import { Chain, createClient, custom, fallback, http } from "viem";
import { hardhat, mainnet } from "viem/chains";
import { createConfig } from "wagmi";
import scaffoldConfig from "~~/scaffold.config";
import { getAlchemyHttpUrl } from "~~/utils/scaffold-eth";
import { Routing } from '@hoprnet/uhttp-lib';

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
    const alchemyHttpUrl = getAlchemyHttpUrl(chain.id);
    const rpcFallbacks = alchemyHttpUrl ? [http(alchemyHttpUrl), http()] : [http()];

    // The fallback transport is used when usePrivateRpc is false
    const fallbackTransport = fallback(rpcFallbacks);
    //
    // The fallback transport is used when usePrivateRpc is true
    const customTransport = custom({
      async request({ method, params }) {
        try {
          const response = await router.fetch(url);
          if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
          }
          const json = await response.json();
          console.log("PRIVATE RPC RESPONSE:", json);

          return "error" in json ? json.error : json.result;
        } catch (e) {
          console.error("PRIVATE RPC ERROR:", e.message);
        }
      }
    });

    const transport = usePrivateRpc ? customTransport : fallbackTransport;

    return createClient({
      chain,
      transport: fallback(rpcFallbacks),

      ...(chain.id !== (hardhat as Chain).id
        ? {
            pollingInterval,
          }
        : {}),
    });
  },
});
