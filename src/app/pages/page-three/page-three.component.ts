import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
declare var cordova: any;
// Type declarations for Cordova
declare global {
  interface Window {
    cordova: any;
    resolveLocalFileSystemURL: any;
  }
}

// Cordova plugins interface
interface CordovaPlugins {
  permissions: {
    checkPermission: (permission: string, callback: (status: any) => void, errorCallback?: (error: any) => void) => void;
    requestPermissions: (permissions: string[], successCallback: (status: any) => void, errorCallback: (error: any) => void) => void;
    WRITE_EXTERNAL_STORAGE: string;
    READ_EXTERNAL_STORAGE: string;
  };
  fileOpener2: {
    open: (filePath: string, mimeType: string, options?: any) => void;
  };
}

@Component({
  selector: 'app-page-three',
  templateUrl: './page-three.component.html'
})
export class PageThreeComponent implements OnInit {
  pageOneData: any = {};
  pageTwoData: any = {};
  passScheduleData: any[] = [];

  @ViewChild('pdfContent', { static: false }) pdfContent!: ElementRef;

  selectedRow: any = null;
  showModal: boolean = false;
  isGeneratingPdf: boolean = false;

  circleDia: string = '';
  circleTh: string = '';
  sheetW: string = '';
  sheetL: string = '';
  sheetTh: string = '';

  constructor(private router: Router) {}

  ngOnInit() {
    this.pageOneData = JSON.parse(sessionStorage.getItem('pageOneData') || '{}');
    this.pageTwoData = JSON.parse(sessionStorage.getItem('pageTwoData') || '{}');
    this.passScheduleData = JSON.parse(sessionStorage.getItem('passScheduleData') || '[]');

    this.circleDia = this.pageTwoData.circleDia || '';
    this.circleTh = this.pageTwoData.circleTh || '';
    this.sheetW = this.pageTwoData.initialWidth || '';
    this.sheetL = this.pageTwoData.initialLength || '';
    this.sheetTh = this.pageTwoData.initialThickness || '';
  }

  testEnvironment() {
    this.checkCapacitorEnvironment();
    alert('Check console for debug information');
  }

  private getCordovaPlugins(): CordovaPlugins | null {
    if (window.cordova && window.cordova.plugins) {
      return window.cordova.plugins as CordovaPlugins;
    }
    return null;
  }

  checkCapacitorEnvironment() {
    console.log('=== CAPACITOR DEBUG INFO ===');
    console.log('Capacitor.isNativePlatform():', Capacitor.isNativePlatform());
    console.log('Capacitor.getPlatform():', Capacitor.getPlatform());
    console.log('Capacitor.isPluginAvailable(Filesystem):', Capacitor.isPluginAvailable('Filesystem'));
    console.log('window.cordova:', !!window.cordova);
    if (window.cordova) {
      console.log('cordova.plugins.permissions:', !!(window.cordova.plugins && window.cordova.plugins.permissions));
      console.log('cordova.plugins.fileOpener2:', !!(window.cordova.plugins && window.cordova.plugins.fileOpener2));
      console.log('cordova.file:', !!window.cordova.file);
    }
    console.log('============================');
  }

  async requestAndroidStoragePermission(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    const plugins = this.getCordovaPlugins();
    if (plugins && plugins.permissions) {
      return new Promise<void>((resolve, reject) => {
        plugins.permissions.checkPermission(
          plugins.permissions.WRITE_EXTERNAL_STORAGE,
          (status: any) => {
            if (status.hasPermission) {
              resolve();
            } else {
              plugins.permissions.requestPermissions(
                [plugins.permissions.READ_EXTERNAL_STORAGE, plugins.permissions.WRITE_EXTERNAL_STORAGE],
                (status: any) => {
                  if (status.hasPermission) resolve();
                  else reject(new Error('Storage permission denied'));
                },
                (err: any) => reject(new Error('Permission request failed'))
              );
            }
          },
          (err: any) => reject(new Error('Permission check failed'))
        );
      });
    }
  }

  async generatePDF() {
    if (this.isGeneratingPdf) return;
    this.isGeneratingPdf = true;
    this.checkCapacitorEnvironment();
    try {
      if (Capacitor.isNativePlatform()) await this.requestAndroidStoragePermission();
      await this.createPDF();
    } catch (err) {
      alert('PDF generation failed: ' + (err instanceof Error ? err.message : JSON.stringify(err)));
    } finally {
      this.isGeneratingPdf = false;
    }
  }

  async createPDF() {
    const content = this.pdfContent.nativeElement;
    if (!content) throw new Error('PDF content element not found');
    content.classList.add('desktop-print-mode');
    await new Promise(resolve => setTimeout(resolve, 300));
    const canvas = await html2canvas(content, { scale: 2, useCORS: true, scrollX: 0, scrollY: -window.scrollY });
    const imgData = canvas.toDataURL('image/jpeg', 0.8);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;
    let heightLeft = imgHeight, position = 0;
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pdfHeight;
    while (heightLeft > 0) {
      position -= pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;
    }
    if (Capacitor.isNativePlatform()) await this.savePDFMobile(pdf);
    else pdf.save(`pass_schedule_${Date.now()}.pdf`);
    this.saveToHistory();
    content.classList.remove('desktop-print-mode');
  }

  async savePDFMobile(pdf: jsPDF) {
  const fileName = `pass_schedule_${Date.now()}.pdf`;
  const base64Data = pdf.output('datauristring').split(',')[1];

  try {
    const result = await Filesystem.writeFile({
      path: `Download/${fileName}`,
      data: base64Data,
      directory: Directory.External,
      encoding: Encoding.UTF8
    });
    await this.openPDFFile(result.uri);
    return;
  } catch (error) {
    console.warn('Capacitor Filesystem failed. Falling back...', error);
  }

  // fallback using Cordova file plugin
  const filePath = window.cordova?.file?.externalRootDirectory + 'Download/' + fileName;

  window.resolveLocalFileSystemURL(
    filePath.replace(fileName, ''),
    (dirEntry: any) => {
      dirEntry.getFile(fileName, { create: true, exclusive: false }, (fileEntry: any) => {
        fileEntry.createWriter((writer: any) => {
          const blob = new Blob([Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))], {
            type: 'application/pdf'
          });
          writer.onwriteend = () => {
            console.log('File saved at:', fileEntry.nativeURL);
            cordova.plugins.fileOpener2.open(fileEntry.nativeURL, 'application/pdf');
          };
          writer.onerror = (e: any) => {
            console.error('Write failed:', e);
            alert('Failed to write PDF to storage');
          };
          writer.write(blob);
        });
      }, (err: any) => {
        console.error('File error:', err);
      });
    }, (err: any) => {
      console.error('Directory access error:', err);
    }
  );
}

  async openPDFFile(filePath: string): Promise<void> {
    const plugins = this.getCordovaPlugins();
    if (plugins && plugins.fileOpener2) {
      plugins.fileOpener2.open(filePath, 'application/pdf', {
        error: (e: any) => console.log('File open error:', e),
        success: () => console.log('File opened successfully')
      });
    }
  }

  saveToHistory() {
    const passesOnly = Array.from({ length: 15 }, (_, i) => this.passScheduleData[i]?.thickness || '');
    const newEntry = {
      date: this.pageOneData.date,
      supervisor: this.pageOneData.supervisor,
      shift: this.pageOneData.shift,
      crm: this.pageOneData.crm,
      ingot: this.pageTwoData.ingot,
      lotNo: this.pageTwoData.lotNo,
      potLid: this.pageTwoData.potLid,
      circleDia: this.circleDia,
      circleTh: this.circleTh,
      sheetW: this.sheetW,
      sheetL: this.sheetL,
      sheetTh: this.sheetTh,
      passes: passesOnly
    };
    const history = JSON.parse(localStorage.getItem('crmHistory') || '[]');
    history.push(newEntry);
    localStorage.setItem('crmHistory', JSON.stringify(history));
  }

  openModal(row: any): void {
    this.selectedRow = row;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  exportToExcel() {
    this.router.navigate(['/history']);
  }

  async testPermissions() {
    try {
      await this.requestAndroidStoragePermission();
      alert('Permissions OK');
    } catch (error) {
      alert('Permission error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }
}
