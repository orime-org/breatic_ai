

// 单例模式
class EditService {
  private static instance: EditService;
  private invalidateCallbacks: Array<() => void> = [];

  private constructor() {}

  public static getInstance(): EditService {
    if (!EditService.instance) {
      EditService.instance = new EditService();
    }
    return EditService.instance;
  }

  //注册invalid的回调
  public registerInvalidateCallback(callback: () => void): void {
    this.invalidateCallbacks.push(callback);
  }

  // 通知所有注册的回调
  public async notifyInvalidate(): Promise<void> {    
    // 调用所有注册的回调
    this.invalidateCallbacks.forEach(callback => callback());
  }
}

export default EditService.getInstance();
