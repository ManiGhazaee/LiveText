export const manual = `
-
Command [Parameter]: | Usage:                   
$name                | Showing your current name  
$name [YOUR_NAME]    | Changing your name       
$join [ROOM_NAME]    | Joining or creating room by name. max room size = 2
$leave | $cya | $bye | Leaving and closing the room     
$man                 | Showing this manual     
$clear | $c          | Clearing text               
$clear_line | $cl    | Clearing the last line 
$math [MATH_EXPR]    | Computing simple math expression
$end_info            | Show current state of end_info. end_info is /*(YOUR_NAME)|(TIME)*/ in text at every StateTransition
$end_info [0|1]      | Set end_info off or on with 0 or 1. default = 1 
-
KeyDown (State):                   | Result:
Shift + Enter                      | Execute command
Shift + Enter (--TALK--)           | Your state -> (--LISTEN--)       | Their state -> (--TALK--)
Shift + Enter (--LISTEN--)         | Your state -> (--TALK-REQUEST--) | Their state -> (--LISTEN-REQUEST--)
Shift + Enter (--TALK-REQUEST--)   | Your state -> (--FORCE-TALK--)   | Their state -> (--FORCE-LISTEN--)
Shift + Enter (--LISTEN-REQUEST--) | Your state -> (--LISTEN--)       | Their state -> (--TALK--)
Shift + Enter (--FORCE-TALK--)     | Your state -> (--LISTEN--)       | Their state -> (--TALK--)
Shift + Enter (--FORCE-LISTEN--)   | Your state -> (--TALK-REQUEST--) | Their state -> (--LISTEN-REQUEST--)
ArrowLeft                          | Move caret to left
ArrowRight                         | Move caret to right
Escape                             | Toggle setting 
-
State:             | Live type: 
--TALK--           | true 
--LISTEN-REQUEST-- | true 
--FORCE-TALK--     | true 
--LISTEN--         | false 
--TALK-REQUEST--   | false 
--FORCE-LISTEN--   | false 
-
Change your name if you haven't ($name [YOUR_NAME]) or clear text ($clear) then join a room ($join [ROOM_NAME])
`;