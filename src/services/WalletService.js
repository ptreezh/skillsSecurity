/**
 * WalletService - 内嵌钱包（纯身份层）
 * Constitution §2: 低门槛参与、无缝注册（嵌入式钱包，无需 MetaMask）
 *
 * Phase 28 / v2.0 变更：
 *   - 链上读写全部经后端网关（ChainDataService / uploadService），
 *     前端钱包不再持有 ethers provider/signer，也不初始化任何合约实例
 *   - 移除 ASK 代币空投余额（无代币宪法，永不发行代币）
 *   - 本地身份仅作为声誉账户标识，链上数据以 /api/reputation 为准
 */

const STORAGE_KEY = 'agentskills_user'

class WalletService {
  constructor() {
    this.user = null
  }

  /**
   * 初始化：恢复本地身份；不存在则注册新内嵌身份（宪法 §2 无缝注册）
   * 注意：本地 reputation 仅作离线兜底展示，真实声誉以链上查询为准
   */
  async init() {
    const savedUser = localStorage.getItem(STORAGE_KEY)
    if (savedUser) {
      try {
        this.user = JSON.parse(savedUser)
        return this.user
      } catch (_) {
        localStorage.removeItem(STORAGE_KEY) // 损坏数据 → 重建身份
      }
    }

    const newUser = {
      address: '0x' + Array.from({ length: 40 }, () =>
        '0123456789abcdef'[Math.floor(Math.random() * 16)]
      ).join(''),
      reputation: 0,
      level: 1,
      dailyLikes: 0,
      lastLikeDate: 0,
      chain: 'chain1'
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser))
    this.user = newUser
    return this.user
  }

  /**
   * 连接钱包：内嵌身份直接激活（无浏览器扩展依赖）
   */
  async connect() {
    const user = await this.init()
    this.user = { ...user, connected: true }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.user))
    return this.user
  }

  /**
   * 断开：保留本地身份数据，仅清除连接态
   */
  disconnect() {
    if (this.user) {
      this.user = { ...this.user, connected: false }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.user))
    }
  }

  /** 当前用户 */
  getUser() {
    return this.user
  }

  /** 是否已连接 */
  isConnected() {
    return Boolean(this.user && this.user.connected)
  }

  /**
   * 交易签名（兼容保留）：链上交易由后端网关提交（ChainMaker chain1），
   * 前端无签名能力，演示模式直接返回占位结果
   */
  async signTransaction(tx) {
    console.log('TX via backend gateway (demo):', tx)
    return { success: true, hash: '0x' + Date.now().toString(16) }
  }
}

export default new WalletService()
