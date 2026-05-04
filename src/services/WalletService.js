// 宪法第二条：低摩擦参与，嵌入式钱包（无感知注册）
class WalletService {
  constructor() {
    this.user = null
  }

  async init() {
    // 简化版：邮箱注册 → 自动生成钱包（宪法第二条）
    const savedUser = localStorage.getItem('agentskills_user')
    if (savedUser) {
      this.user = JSON.parse(savedUser)
      return this.user
    }

    // 新用户注册（嵌入式，无感知）
    const newUser = {
      address: '0x' + Math.random().toString(16).substr(2, 40),
      reputation: 0,
      level: 1,
      dailyLikes: 0,
      lastLikeDate: 0,
      balance: 100  // Airdrop: 100 ASK
    }
    
    localStorage.setItem('agentskills_user', JSON.stringify(newUser))
    this.user = newUser
    return this.user
  }

  async signTransaction(tx) {
    // 后台签名（宪法第二条：无用户感知）
    console.log('TX signed (background):', tx)
    return { success: true, hash: '0x...' + Date.now() }
  }

  getUser() {
    return this.user
  }
}

export default new WalletService()
