import { Injectable } from '@angular/core';

declare var cordova: any;

@Injectable({
  providedIn: 'root'
})
export class FileOpenerService {
  open(filePath: string, mimeType: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!cordova || !cordova.plugins || !cordova.plugins.fileOpener2) {
        reject('Cordova FileOpener2 plugin not available.');
        return;
      }

      cordova.plugins.fileOpener2.open(
        filePath,
        mimeType,
        {
          error: (e: any) => reject(e),
          success: () => resolve(true)
        }
      );
    });
  }
}