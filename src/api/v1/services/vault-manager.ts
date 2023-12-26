import vault from "node-vault";
import { VAULT_TOKEN, VAULT_URL } from "../config";
import { errorLog } from "../utilities/log";

class VaultManager {
  private static instance: VaultManager;
  private vaultClient: vault.client; // Adjust the type based on your needs

  private constructor() {
    // Initialize Vault client in the constructor
    this.vaultClient = vault({
      apiVersion: "v1",
      endpoint: VAULT_URL, // Update with your Vault server URL
      token: VAULT_TOKEN // Update with your Vault token
    });
  }

  public static getInstance(): VaultManager {
    if (!VaultManager.instance) {
      VaultManager.instance = new VaultManager();
    }
    return VaultManager.instance;
  }

  public async read(path: string): Promise<Record<string, string>> {
    // path example -> secret/data/{key} || kv/data/{key}
    try {
      const res = await this.vaultClient.read(path);
      return res.data.data;
    } catch (error) {
      errorLog("VAULT READ ERROR::: ", error);
      throw new Error("INTERNAL SERVER ERROR");
    }
  }

  public async write(
    path: string,
    data: Record<string, string>
  ): Promise<Record<string, string>> {
    // path example -> secret/data/{key} || kv/data/{key}
    try {
      const res = await this.vaultClient.write(path, {
        data: data
      });
      return res.data.data;
    } catch (error) {
      errorLog("VAULT WRITE ERROR::: ", error);
      throw new Error("INTERNAL SERVER ERROR");
    }
  }
}

export default VaultManager;
