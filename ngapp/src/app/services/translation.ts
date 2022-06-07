import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthenticationService } from 'app/services/authentication';
import config from 'abairconfig';
import trans_pre from 'app/translation';


const translations = /*iefe*/(()=>{
  const ga = {};
  const en = {};
  for(const k of Object.keys(trans_pre)) {
    ga[k] = trans_pre[k].ga;
    en[k] = trans_pre[k].en;
  }
  return {ga,en};
})();


export enum LANGUAGE {
  ENGLISH = 0,
  IRISH =  1,
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {

  currentLanguage: LANGUAGE;

  constructor(private auth : AuthenticationService, private http : HttpClient) { }

  l: any = '';
  baseUrl: string = config.baseurl;

  initLanguage() {
    if (this.auth.isLoggedIn()) {
      this.getUserLanguageCode().subscribe((res) => {
        this.l = this.getLanguageFromCode(res.language);
      });
    } else {
      this.l = this.getLanguageFromCode('ga');
    }
  }

  setLanguage(code: 'ga'|'en') {
    this.l = this.getLanguageFromCode(code);

    this.currentLanguage = (this.l.iso_code === 'en' ? LANGUAGE.ENGLISH : LANGUAGE.IRISH);

    if (this.auth.isLoggedIn()) {
      this.updateUserLanguage(code).subscribe();
    }
  }

  inIrish() : boolean {
    return (this.l.name === "Gaeilge");
  }

  inEnglish() : boolean {
    return (this.l.name === "English");
  }

  getLanguageFromCode(code: 'ga'|'en'): object {
    return translations[code] ?? translations['ga'];
  }

  getCurrentLanguage() : string {
    if(this.l) {
      return this.l.name;
    }
    else {
      this.setLanguage('ga');
      return "Gaeilge";
    }
    
  }

  updateUserLanguage(code : string) : Observable<any> {
    return this.http.post(this.baseUrl + "user/setLanguage/" + this.auth.getUserDetails()._id, {language : code});
  }

  getUserLanguageCode() : Observable<any> {
    return this.http.get(this.baseUrl + "user/getLanguage/" + this.auth.getUserDetails()._id);
  }

}
