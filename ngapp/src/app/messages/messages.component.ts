import { Component, OnInit, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Classroom } from '../classroom';
import { Observable } from 'rxjs';
import { User } from '../user';
import { Message } from '../message';
import { UserService } from '../user.service';
import { TranslationService } from '../translation.service';
import { ClassroomService } from 'app/classroom.service';
import { Router, ActivatedRoute } from '@angular/router';
import { v4 as uuid } from 'uuid';
import { AuthenticationService } from '../authentication.service';
import { MessageService } from '../message.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ProfileService } from '../profile.service';
import { NotificationService } from '../notification-service.service';

declare var MediaRecorder : any;

@Component({
  selector: 'app-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.scss']
})
export class MessagesComponent implements OnInit {
  
  //message variables
  createNewMessage: boolean = false;
  students : User[] = [];
  receivedMessages: Message[] = [];
  classroom : Classroom = new Classroom;
  messageSent: boolean = false;
  studentId: string = '';
  teacherId: string = '';
  teacherName: string = '';
  isTeacher: Boolean = false;
  isStudent: Boolean = false;
  name: string = '';
  showBody: boolean = false;
  messageContent: string = '';
  numberOfUnread: number = 0;
  totalNumberOfMessages: number = 0;
  deleteMode: Boolean = false;
  toBeDeleted: string[] = [];
  isFromAmerica: boolean = false;
  lastClicked : string = '';
  config = {
    toolbar :  [
      [ 'bold', 'italic', 'underline', 'strike' ],
      [{ 'list': 'ordered' }, { 'list': 'bullet'}],
      ['link'],
    ]
  }
  
  //used for creating a new message
  message: Message = {
    _id: '',
    id: '',
    subject: '',
    date: new Date(),
    senderId: '',
    senderUsername: '',
    recipientId: '',
    text: '',
    seenByRecipient: false,
    audioId: ''
  };
  
  //audio file variables
  modalClass : string = "hidden";
  recording: boolean = false;
  audioSource : SafeUrl;
  feedbackText: string;
  feedbackSent : boolean = false;
  newRecording : boolean = false;
  showListenBack : boolean = false;
  canSendAudio : boolean = false;
  showAudio: boolean = false;
  blob: any;
  errorText : string;
  registrationError : boolean;
  recorder;
  stream;
  chunks;


  constructor(private classroomService: ClassroomService,
              private userService: UserService, 
              private route: ActivatedRoute,
              private auth: AuthenticationService, 
              public ts : TranslationService,
              private router: Router,
              private messageService: MessageService,
              protected sanitizer: DomSanitizer,
              protected profileService: ProfileService,
              protected notificationService: NotificationService) { }

  /*
  * Get classroom and student information for TEACHER, get teacher information for STUDENT 
  * Get message inbox
  * Set the date of the messages depending on the user's country
  */  
  ngOnInit() {
    this.deleteMode = false;
    this.toBeDeleted = [];
    this.chunks = [];
    this.canSendAudio = false;
    
    const userDetails = this.auth.getUserDetails();
    
    // Return if user not logged in to avoid calling null.role (which results in error)
    if (!userDetails) return;

    if(userDetails.role === "TEACHER") {
      this.isTeacher = true;
      this.getClassroom();
      this.teacherId = this.auth.getUserDetails()._id;
    }
    if(userDetails.role === "STUDENT") {
      this.studentId = this.auth.getUserDetails()._id;
      this.classroomService.getClassroomOfStudent(this.studentId).subscribe((res: Classroom) => {
        this.classroom = res;
        this.teacherId = this.classroom.teacherId;
        this.getMessages();
        
        this.userService.getUserById(this.teacherId).subscribe( (res) => {
          this.teacherName = res.username;
        });
      });
      this.isStudent = true;
    }
    
    // get date format for user 
    this.profileService.getForUser(userDetails._id).subscribe((res) => {
      let p = res.profile;
      let country = p.country;
      if(country == "United States of America" || country == "America" || country == "USA" || country == "United States") {
        this.isFromAmerica = true;
      }
      else {
        this.isFromAmerica = false;
      }
    });
  }
  
  /*
  * Set remaining message fields that were not filled with the form 
  * Use message service to send message to the DB
  * Add audio file to DB if audio taken
  */
  sendMessage() {
    //Add new message to DB
    if(this.message.text) {
      this.message.id = uuid();
      this.message.date = new Date();
      this.message.seenByRecipient = false;
      this.message.senderUsername = this.auth.getUserDetails().username;
      let ids: string[] = [];
      
      if(this.isTeacher) {
        this.message.senderId = this.teacherId;
        if(this.message.recipientId === this.classroom._id) {
          for(let id of this.classroom.studentIds) {
            this.message.recipientId = id;
            this.message.id = uuid();
            ids.push(this.message.id);
            this.messageService.saveMessage(this.message);
          }
        }
        else {
          this.messageService.saveMessage(this.message);
          ids.push(this.message.id);
        }
      }
      
      if(this.isStudent) {
        this.message.senderId = this.studentId;
        this.message.recipientId = this.teacherId;
        this.messageService.saveMessage(this.message);
        ids.push(this.message.id);
      }
      //Add audio to DB if taken
      if(this.canSendAudio) {
        for(let id of ids) {
          this.messageService.getMessageById(id).subscribe((res) => {
            this.messageService.addMessageAudio(res._id, this.blob).subscribe((res) => {
              this.hideModal();
            }, (err) => {
              this.errorText = err.message;
              this.registrationError = true;
            });
          })
        }
      }
      this.createNewMessage = false;
      this.chunks = [];
      this.audioSource = null;
      this.canSendAudio = false;
    }
    else {
      alert("Message empty")
    }

  }
  
  /*
  * Get messages form database for logged in user
  */
  getMessages() {  
    this.messageService.getMessagesForLoggedInUser().subscribe( (res: Message[]) =>{
      this.receivedMessages = [];
      if(this.isTeacher) {
        let messages = res;
        for(let m of messages) {
          for(let s of this.classroom.studentIds) {
            if(s === m.senderId) {
              this.receivedMessages.push(m);
            }
          }  
        }
      }
      else {
        this.receivedMessages = res;
      }
      this.receivedMessages.sort((a, b) => (a.date > b.date) ? -1 : 1)
      this.numberOfUnread = this.messageService.getNumberOfUnreadMessages(this.receivedMessages);
      this.totalNumberOfMessages = this.receivedMessages.length; 
    });
    
  }
  
  /*
  * Get classroom id from route parameters
  */
    getClassroomId(): Promise<any> {
      return new Promise((resolve, reject) => {
        this.route.params.subscribe(
          params => {
            resolve(params);
        });
      });
    }

  /*
  * Get classroom id with function and call getClassroom with classroom service
  * call function to get list of students
  * Get the messages for the particular classroom by calling getMessages function
  */
    getClassroom() {
      this.getClassroomId().then((params) => {
        let id: string = params.id.toString();
        this.classroomService.getClassroom(id).subscribe((res : Classroom) => {
          this.classroom = res;
          this.getMessages();
          this.getStudents();
        });
      });
    }

  /*
  * Loop through student ids in classroom object to get student objects
  */
    getStudents() {
      this.students = [];
      for(let id of this.classroom.studentIds) {
        this.userService.getUserById(id).subscribe((res : User) => {
          this.students.push(res);
          this.students.sort((a, b) => a.username.toLowerCase().localeCompare(b.username.toLowerCase()));
        });
      }
    }
    
  /*
  * Rerout the user to homepage depending on student/teacher
  */  
  goBack() {
    if(this.createNewMessage) {
      this.createNewMessage = false;
      this.chunks = [];
      this.audioSource = null;
      this.canSendAudio = false;
    }
    else {
      if(this.isTeacher) {
        this.router.navigateByUrl(`teacher/classroom/${this.classroom._id}`);
      }
      else {
        this.router.navigateByUrl('contents');
      }
    }
  }
  
  /*
  * Set the parameters for showing the message body
  * Set the CSS class for a clicked message
  * Update nav bar notifications at the top of the screen
  */
  showMessageBody(message: Message) {
    if(message) {
      let id = "message-" + message.id;
      let messageElement = document.getElementById(id);
      
      if(this.lastClicked != '') {
        let previousMessage = document.getElementById(this.lastClicked);
        previousMessage.classList.remove("clickedresultCard");
      }
      this.lastClicked = id;
      messageElement.classList.add("clickedresultCard");
      
      this.messageContent = message.text;
      
      if(!message.seenByRecipient) {
        this.numberOfUnread--;
        if(this.isTeacher) {
          this.notificationService.removeTeacherMessage(message.senderId);
        }
        if(this.isStudent) {
          this.notificationService.removeMessage(message);
        }
        this.messageService.markAsOpened(message._id).subscribe(() => {
          message.seenByRecipient = true;
        });
      }
      
      if(message.audioId) {
        this.getMessageAudio(message._id);
        this.showAudio = true;
      }
      else {
        this.showAudio = false;
      }
    }
  }
  
  /*
  * get audio message from the database using the message service and message id
  */
  getMessageAudio(id: string) {
    this.messageService.getMessageAudio(id).subscribe((res) => {
      if(res) {
        this.audioSource = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(res));
      }
    });
  }

  /*
  * Create media object and record audio
  */
    recordAudio() {
      let media = {
        tag: 'audio',
        type: 'audio/mp3',
        ext: '.mp3',
        gUM: {audio: true}
      }
      navigator.mediaDevices.getUserMedia(media.gUM).then(_stream => {
        this.stream = _stream;
        this.recorder = new MediaRecorder(this.stream);
        this.startRecording();
        this.recorder.ondataavailable = e => {
          this.chunks.push(e.data);
          if(this.recorder.state == 'inactive') {

          };
        };
      }).catch();
      
    }

  /*
  * Call the recording audio function
  */
    prepRecording() {
      this.recordAudio();
    }

  /*
  * Set parameters for recording audio and start the process
  */
    startRecording() {
      this.recording = true;
      this.newRecording = false;
      this.showListenBack = false;
      this.chunks = [];
      this.recorder.start();
    }

  /*
  * Reset parameters for recording audio and stop the process 
  */
    stopRecording() {
      this.recorder.stop();
      this.recording = false;
      this.showListenBack = true;
      this.canSendAudio = true;
      this.stream.getTracks().forEach(track => track.stop());
    }

  /*
  * Playback the recorded audio
  */
    playbackAudio() {
      this.audioSource = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(new Blob(this.chunks, {type: 'audio/mp3'})));
      this.newRecording = true;
    }

  /*
  * Save audio data into a blob (function called in sendMessage)
  */
    saveAudio() {
      this.blob = new Blob(this.chunks, {type: 'audio/mp3'});
      this.modalClass = "hiddenFade";
    }
    
  // change css class to show recording container
    showModal() {
      this.modalClass = "visibleFade";
    }
    
  // clear out audio source if it exists and close new messsage
    resetForm() {
      if(this.audioSource) {
        this.audioSource = null;
        this.chunks = [];
      }
      this.createNewMessage = false;
    }

  // change the css class to hide the recording container 
    hideModal() {
      this.modalClass = "hiddenFade";
      if(this.recorder.state != 'inactive') {
        this.recorder.stop();
        this.stream.getTracks().forEach(track => track.stop());
      }
      this.recording = false;
      this.newRecording = false;
      this.showListenBack = false;
    }
    
  /* delete messages added to the to be deleted array
  * deletes message using the message service 
  * deletes associated audio files if there are any
  */
    toggleDeleteMode() {
      if(this.deleteMode && this.toBeDeleted.length > 0) {
        for(let id of this.toBeDeleted) {
          this.messageService.deleteMessageAudio(id).subscribe( (res) => {
            if(res) {
            }
          });
        
          this.messageService.deleteMessage(id).subscribe(
            res => {
              //this.ngOnInit();
            }
          );
        }
        this.lastClicked = '';
        this.ngOnInit();
      } else if(this.deleteMode && this.toBeDeleted.length === 0) {
        this.deleteMode = false;
      } else {
        this.deleteMode = true;
      }
    }

  //add message to be deleted to an array given the message id as a paramter
    toggleDelete(id: string) {
      if(this.toBeDeleted.includes(id)) {
        var indexToRemove = this.toBeDeleted.indexOf(id);
        this.toBeDeleted.splice(indexToRemove, 1);
      } else {
        this.toBeDeleted.push(id);
      }
    }
    
  //reset the notifications at the nav bar on the top of the screen
    resetMessages() {
      this.notificationService.setNotifications();
    }
}
