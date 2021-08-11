import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { identifierModuleUrl } from '@angular/compiler';
import { TranslationService } from '../../translation.service';
import config from '../../../abairconfig.json';
import { UUID } from 'angular2-uuid';

function uuid() {
  return UUID.UUID();
}

@Component({
  selector: 'app-teachers',
  templateUrl: './teachers.component.html',
  styleUrls: ['./teachers.component.css']
})

export class TeachersComponent implements OnInit {

  teacherCode : String;
  activeTeacherCodes : TeacherCodeDetails[];
  codeToDelete : String;

  teachers : Object[];

  copiedTextClass : String = "hidden";
  modalClass : String = "hidden";

  baseUrl: string = config.baseurl;

  constructor(private http: HttpClient, private router: Router, public ts: TranslationService) { }

  ngOnInit() {
    this.getActiveTeacherCodes();
    this.getTeachers();
  }

  generateCode() {
    this.teacherCode = uuid();
    const teacherCodeObj = {
      code : this.teacherCode,
    };
    console.log(teacherCodeObj);
    this.http.post(this.baseUrl + 'teacherCode/create', teacherCodeObj)
      .subscribe(res => {
        console.log("Teacher code created!", res)
        this.getActiveTeacherCodes();
      });
  }

  getActiveTeacherCodes() {
    this.http.get(this.baseUrl + 'teacherCode/activeCodes').subscribe((res: TeacherCodeDetails[]) => {
      this.activeTeacherCodes = res;
      console.log("teacher codes", this.activeTeacherCodes);
    });
  }

  getTeachers() {
    this.http.get(this.baseUrl + 'user/teachers').subscribe((res: Object[]) => {
      this.teachers = res;
    }); 
  }

  deleteTeacherCode() {
    if(this.codeToDelete != null) {
      console.log(this.codeToDelete);
      this.http.get(this.baseUrl + 'teacherCode/delete/' + this.codeToDelete).subscribe((res) => {
        this.getActiveTeacherCodes();
        this.hideModal();
      });
    } else {
      console.log("Error, code id not found.");
    }
    
  }

  copyToClipboard() {
    document.addEventListener('copy', (e: ClipboardEvent) => {
      e.clipboardData.setData('text/plain', (this.teacherCode.toString()));
      e.preventDefault();
      document.removeEventListener('copy', null);
    });
    document.execCommand('copy');
    this.copiedTextClass = "visible";
    setTimeout(() => this.copiedTextClass = "hiddenFade", 1000);
  }

  showModal(code : String) {
    this.modalClass = "visibleFade";
    this.codeToDelete = code;
  }

  hideModal() {
    this.modalClass = "hiddenFade";
  }

  goToUser(userId) {
    this.router.navigateByUrl('admin/user/' + userId.toString());
  }

}

class TeacherCodeDetails {
    _id: String;
    code: String;
}
