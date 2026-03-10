export class Session {
    constructor(
      public id: string,
      public userId: string,
      public familyId: string,
      public refreshCounter: number = 0,
      public deviceFingerprint?: string,
      public revoked: boolean = false
    ) {}
  }