import { Component, OnInit } from '@angular/core';
import { Story } from '../../story';
import { StoryService } from '../../story.service';
import { AuthenticationService, TokenPayload, UserDetails } from '../../authentication.service';
import { EventType } from '../../event';
import { EngagementService } from '../../engagement.service';
import { TranslationService } from '../../translation.service';
import { ProfileService } from '../../profile.service';
import { Router } from '@angular/router';
import { MessageService } from '../../message.service';
import { Message } from '../../message';
import { ClassroomService } from '../../classroom.service';
import { NotificationService } from '../../notification-service.service';
import { RecordingService } from '../../recording.service';
import { FilterPipe } from 'app/pipes/filter.pipe'; // used in html template

@Component({
  selector: 'app-book-contents',
  templateUrl: './book-contents.component.html',
  styleUrls: ['./book-contents.component.scss'],
  providers: [
    FilterPipe,
  ],
})
export class BookContentsComponent implements OnInit {
  stories: Story[] = [];
  deleteMode: Boolean;
  editMode: boolean;
  toBeDeleted: string[] = [];
  userId: string = '';
  messagesForNotifications : Message[] = [];
  unreadMessages: number = 0;
  isFromAmerica: boolean = false;
  isEnrolled: boolean = false;
  searchText: string = '';

  constructor(
    private storyService: StoryService,
    private auth: AuthenticationService,
    private engagement: EngagementService,
    public ts:  TranslationService,
    private router: Router,
    private messageService: MessageService,
    private profileService: ProfileService,
    private classroomService: ClassroomService,
    private ns: NotificationService,
    private recordingService: RecordingService) { }


  // Set story array of stories for logged in user
  // set delete mode to false and create empty to be deleted array
  ngOnInit() {
    const userDetails = this.auth.getUserDetails();
    if(!userDetails) {
      window.alert('no user details available');
      return;
    }
    // get stories for the user
    this.storyService
      .getStoriesForLoggedInUser()
      .subscribe(
        (data) => {
          this.stories = data.map(storyData => new Story().fromJSON(storyData));
          this.stories.sort((a, b) => (a.date > b.date) ? -1 : 1)
        },
        window.alert
      );
    this.userId = userDetails._id;
    this.deleteMode = false;
    this.toBeDeleted = [];
    this.ns.setNotifications();
    
    //see if student is enrolled in a class (if not the case, hide message feature in html)
    this.classroomService.getClassroomOfStudent(this.userId).subscribe( (res) => {
      if(res != null) {
        this.isEnrolled = true;
      }
      else {
        this.isEnrolled = false;
      }
    })
    
    // get number of unread messages
    this.messageService.getMessagesForLoggedInUser().subscribe((res: Message[]) => {
      this.messagesForNotifications = res;
      this.unreadMessages = this.messageService.getNumberOfUnreadMessages(this.messagesForNotifications);
    });

    // get date format for user 
    this.profileService.getForUser(this.userId).subscribe((res) => {
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
  
//use story service to set the chosen story
  chooseStory(story: Story) {
    this.storyService.chosenStory = story;
  }

/* delete stories added to the to be deleted array
* adds delete event to event list 
* deletes story using the story service 
*/
  toggleDeleteMode() {
    if(this.deleteMode && this.toBeDeleted.length > 0) {
      for(let id of this.toBeDeleted) {
        this.engagement.addEventForLoggedInUser(EventType["DELETE-STORY"], {_id: id});
        
        this.recordingService.deleteStoryRecordingAudio(id).subscribe((res) => {
        });
        this.recordingService.deleteStoryRecording(id).subscribe( (res) => {
        })
        this.storyService.deleteStory(id).subscribe(
          res => {
            this.ngOnInit();
          }
        );
      }
    } else if(this.deleteMode && this.toBeDeleted.length === 0) {
      this.deleteMode = false;
    } else {
      this.deleteMode = true;
    }
  }

//Change the edit mode to true or false
  toggleEditMode() {
    this.editMode = !this.editMode;
  }

//add story to be deleted to an array given the story id as a paramter
  toggleDelete(id: string) {
    if(this.toBeDeleted.includes(id)) {
      var indexToRemove = this.toBeDeleted.indexOf(id);
      this.toBeDeleted.splice(indexToRemove, 1);
    } else {
      this.toBeDeleted.push(id);
    }
  }
  
  goToMessages() {
    this.router.navigateByUrl('/messages/' + this.userId);
  }

}
