class HttpError extends Error {
  private _httpCode: number;
  private _description: string;

  public get httpCode() {
    return this._httpCode;
  }


  constructor(message: string, errorCode: number) {
    super(message);
    this._httpCode = errorCode;
  }
}

export default HttpError;
