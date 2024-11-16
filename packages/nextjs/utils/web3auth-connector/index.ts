import type { web3AuthWalletConnectOptions } from "./interface";
import { Wallet, getWalletConnectConnector } from "@rainbow-me/rainbowkit";
import { AuthAdapter } from "@web3auth/auth-adapter";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { Web3AuthNoModal } from "@web3auth/no-modal";

export const web3AuthWallet = ({ projectId, walletConnectParameters }: web3AuthWalletConnectOptions): Wallet => {
  const exampleClientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ";

  const chainConfig = {
    chainNamespace: CHAIN_NAMESPACES.EIP155,
    chainId: "0xaa36a7",
    rpcTarget: "https://rpc.ankr.com/eth_sepolia",
    // Avoid using public rpcTarget in production.
    // Use services like Infura, Quicknode etc
    displayName: "Ethereum Sepolia Testnet",
    blockExplorerUrl: "https://sepolia.etherscan.io",
    ticker: "ETH",
    tickerName: "Ethereum",
    logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
  };

  const privateKeyProvider = new EthereumPrivateKeyProvider({ config: { chainConfig } });

  const web3auth = new Web3AuthNoModal({
    clientId: process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID ?? exampleClientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
    privateKeyProvider,
  });

  const authAdapter = new AuthAdapter();
  web3auth.configureAdapter(authAdapter);

  return {
    id: "web3-auth-wallet",
    name: "Web3Auth",
    iconUrl: "https://web3auth.io/images/logo-light.svg",
    iconBackground: "#FFFFFF",
    mobile: {
      getUri: (uri: string) => uri,
    },
    qrCode: {
      getUri: (uri: string) => uri,
      instructions: {
        learnMoreUrl: "https://web3auth.io/docs/index.html",
        steps: [
          {
            description: "We recommend putting My Wallet on your home screen for faster access to your wallet.",
            step: "install",
            title: "Open the My Wallet app",
          },
          {
            description: "After you scan, a connection prompt will appear for you to connect your wallet.",
            step: "scan",
            title: "Tap the scan button",
          },
        ],
      },
    },
    createConnector: getWalletConnectConnector({
      projectId,
      walletConnectParameters,
    }),
    // createConnector: ({ rkDetails }) => Web3AuthConnectorWagmi({ web3AuthInstance: web3auth }),
  };
};
