//
//  AppDelegate.h
//
//  Created by Jeff Piazza on 4/21/14.
//  Copyright (c) 2014 ___FULLUSERNAME___. All rights reserved.
//

#import <Cocoa/Cocoa.h>
#import "Poller.h"

@interface AppDelegate : NSObject <NSApplicationDelegate>
{
}

- (void) startRecording;
- (void) stopRecording;
- (void) replayRecording;

- (void) setPortMessage: (NSString*) msg;
- (void) setStatus: (NSString*) msg;

@property BOOL isPlaying;

@property (retain) NSArray* videoDevices;
@property (retain) NSArray* audioDevices;
@property (assign) AVCaptureDevice* selectedVideoDevice;
@property (assign) AVCaptureDevice* selectedAudioDevice;

@property (assign) IBOutlet NSWindow *window;
@property (weak) IBOutlet NSView *previewView;
@property (weak) IBOutlet NSTextField* portView;
@property (weak) IBOutlet NSTextField* statusView;

@property (assign) IBOutlet NSWindow* urlSheet;
@property (weak) IBOutlet NSTextField* urlField;

@property (retain) Poller* poller;

// Playback:
@property (weak) IBOutlet AVPlayerView *playerView;

@property (retain) NSString* url;

@end