import { wagmiConnectors } from "./wagmiConnectors";
import { Routing } from "@hoprnet/uhttp-lib";
import { Chain, createClient, custom, fallback, http } from "viem";
import { hardhat, mainnet } from "viem/chains";
import { createConfig } from "wagmi";
import scaffoldConfig from "~~/scaffold.config";
import { getAlchemyHttpUrl } from "~~/utils/scaffold-eth";

const { targetNetworks, usePrivateRpc, pollingInterval, uhttpClientId } = scaffoldConfig;
const router = new Routing.Client(uhttpClientId, { forceZeroHop: true, clientAssociatedExitNodes: false });

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

    // If alchemy is not available, we need to manually fetch the provider
    // from viem/chains
    const provider = alchemyHttpUrl || chain?.rpcUrls.default.http[0];

    // The custom private transport is used when usePrivateRpc is true
    const customTransport = custom({
      async request({ method, params }) {
        try {
          // The request is sent to the uHTTP router following the
          // Ethereum JSON-RPC format.
          const response = await router.fetch(provider, {
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: 1, // always use the same id
              jsonrpc: "2.0",
              method,
              params,
            }),
            method: "POST",
          });

          if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
          }

          const json = await response.json();

          return "error" in json ? json.error : json.result;
        } catch (e: any) {
          console.error("PRIVATE RPC ERROR:", e);
        }
      },
    });

    // The custom private transport may only be used when using a publicly
    // reachable RPC endpoint.
    let transport;
    if (usePrivateRpc && !isHardhat) {
      console.log("Using private RPC access via uHTTP");
      transport = customTransport;
    } else {
      transport = fallbackTransport;
      if (!isHardhat) {
        console.log("Using non-private RPC access");
      }
    }

    return createClient({
      chain,
      transport,
      ...(!isHardhat ? { pollingInterval } : {}),
    });
  },
});
