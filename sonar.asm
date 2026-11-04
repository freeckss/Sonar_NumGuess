; =============================================================================
; Project Title : SONAR-X86: Acoustic Number Guessing System (Blind Accessible)
; Course        : CAO10 - Computer Architecture and Organization
; Proponents    : Crisostomo, David, Sotor (Angeles University Foundation)
; Assembler     : Netwide Assembler (NASM) - 16-bit MS-DOS .COM format
; Build Command : nasm -f bin sonar.asm -o sonar.com
; Environment   : MS-DOS / DOSBox v0.74-3 / EMU8086
; =============================================================================

CPU 386
ORG 100h

SECTION .text

MAIN_MENU:
    MOV AX, CS
    MOV DS, AX
    MOV ES, AX

    CALL SELECT_MODE
    CMP BYTE [selected_mode], 3
    JE EXPERT_MODE_INIT
    CALL SELECT_DIFFICULTY

    CALL SEED_TARGET
    CALL INIT_SCREEN

    MOV BL, 0Bh
    MOV DX, msg_header_top
    CALL PRINT_COLOR

    MOV BL, 0Eh
    MOV DX, msg_header_title
    CALL PRINT_COLOR

    MOV BL, 0Bh
    MOV DX, msg_header_bot
    CALL PRINT_COLOR

    MOV BL, 07h
    MOV DX, msg_rules
    CALL PRINT_COLOR

    JMP GAME_LOOP

EXPERT_MODE_INIT:
    MOV WORD [attempts], 6
    MOV BYTE [current_row], 0
    CALL SELECT_EXPERT_EQUATION
    CALL INIT_SCREEN

    MOV BL, 0Eh
    MOV DX, msg_expert_title
    CALL PRINT_COLOR
    MOV BL, 0Bh
    MOV DX, msg_expert_rules
    CALL PRINT_COLOR
    JMP EXPERT_MODE_LOOP

SELECT_EXPERT_EQUATION:
    PUSH AX
    PUSH BX
    PUSH CX
    PUSH DX
    PUSH SI
    PUSH DI

    XOR AH, AH
    INT 1Ah
    MOV AX, DX
    XOR DX, DX
    MOV BX, 12
    DIV BX
    MOV AX, DX
    MOV BX, 8
    MUL BX
    MOV SI, eq_pool
    ADD SI, AX
    MOV DI, target_equation
    MOV CX, 8
.copy_equation:
    MOV AL, [SI]
    MOV [DI], AL
    INC SI
    INC DI
    LOOP .copy_equation

    POP DI
    POP SI
    POP DX
    POP CX
    POP BX
    POP AX
    RET

EXPERT_MODE_LOOP:
    CMP WORD [attempts], 0
    JE EXPERT_MODE_LOSS

    CMP BYTE [current_row], 5
    JNE .not_last_chance
.not_last_chance:
    MOV AH, 02h
    XOR BH, BH
    MOV DH, [current_row]
    ADD DH, 5
    XOR DL, DL
    INT 10h

    MOV BL, 0Fh
    MOV DX, msg_expert_prompt
    CALL PRINT_COLOR
    XOR AX, AX
    MOV AL, [current_row]
    INC AX
    CALL PRINT_NUM
    MOV BL, 0Fh
    MOV DX, msg_expert_separator
    CALL PRINT_COLOR
    MOV AH, 03h
    XOR BH, BH
    INT 10h
    MOV [nerdle_input_row], DH
    MOV [nerdle_input_col], DL
    CALL READ_EXPERT_EQUATION
    CALL EVALUATE_NERDLE_ROW
    CALL RENDER_NERDLE_ROW
    CALL CHECK_NERDLE_WIN
    CMP AL, 1
    JE EXPERT_MODE_WIN

    INC BYTE [current_row]
    DEC WORD [attempts]
    JMP EXPERT_MODE_LOOP

EXPERT_MODE_WIN:
    MOV BL, 0Ah
    MOV DX, msg_expert_win
    CALL PRINT_COLOR
    MOV AX, 6
    SUB AX, [attempts]
    INC AX
    CALL PRINT_NUM
    MOV BL, 0Ah
    MOV DX, msg_footer
    CALL PRINT_COLOR
    CALL SOUND_VICTORY_FANFARE
    JMP ASK_REPLAY

EXPERT_MODE_LOSS:
    MOV BL, 0Ch
    MOV DX, msg_expert_lose
    CALL PRINT_COLOR
    CALL PRINT_EXPERT_TARGET
    MOV BL, 0Ch
    MOV DX, msg_footer
    CALL PRINT_COLOR
    CALL SOUND_DEFEAT_TONE
    JMP ASK_REPLAY

READ_EXPERT_EQUATION:
    PUSH BX
    PUSH CX
    PUSH DX
    PUSH SI
    PUSH DI

    MOV BYTE [nerdle_len], 0

EXPERT_INPUT_LOOP:
    MOV AH, 00h
    INT 16h

    CMP AL, 1Bh
    JE ABORT_TO_MAIN_MENU
    CMP AL, 08h
    JE .handle_backspace
    CMP AL, 0Dh
    JE .handle_enter

    CMP AL, '+'
    JE .valid_char
    CMP AL, '-'
    JE .valid_char
    CMP AL, '*'
    JE .valid_char
    CMP AL, '/'
    JE .valid_char
    CMP AL, '='
    JE .valid_char

    CMP AL, '0'
    JB .invalid_char
    CMP AL, '9'
    JBE .valid_char
    JMP .invalid_char

.invalid_char:
    CALL SOUND_ERROR_BUZZ
    JMP EXPERT_INPUT_LOOP

.valid_char:
    CMP BYTE [nerdle_len], 8
    JAE .buffer_full
    XOR BX, BX
    MOV BL, [nerdle_len]
    MOV [user_equation + BX], AL
    INC BYTE [nerdle_len]
    MOV AH, 0Eh
    XOR BH, BH
    INT 10h
    JMP EXPERT_INPUT_LOOP

.buffer_full:
    CALL SOUND_ERROR_BUZZ
    JMP EXPERT_INPUT_LOOP

.handle_backspace:
    CMP BYTE [nerdle_len], 0
    JE EXPERT_INPUT_LOOP
    DEC BYTE [nerdle_len]
    MOV AH, 0Eh
    MOV AL, 08h
    XOR BH, BH
    INT 10h
    MOV AL, ' '
    INT 10h
    MOV AL, 08h
    INT 10h
    JMP EXPERT_INPUT_LOOP

.handle_enter:
    CMP BYTE [nerdle_len], 8
    JNE .not_enough_chars
    CALL VERIFY_NERDLE_SYNTAX
    JC HANDLE_INVALID_EQUATION
    MOV AH, 0Eh
    MOV AL, 0Dh
    XOR BH, BH
    INT 10h
    MOV AL, 0Ah
    INT 10h

    MOV BYTE [nerdle_len], 0
    POP DI
    POP SI
    POP DX
    POP CX
    POP BX
    JMP EVALUATE_NERDLE_ROW

.not_enough_chars:
    CALL SOUND_ERROR_BUZZ
    JMP EXPERT_INPUT_LOOP

HANDLE_INVALID_EQUATION:
    CALL SOUND_ERROR_BUZZ

    MOV AH, 02h
    XOR BH, BH
    MOV DH, 23
    MOV DL, 0
    INT 10h
    MOV DX, msg_invalid_eq
    MOV AH, 09h
    INT 21h

    MOV DH, [nerdle_input_row]
    MOV DL, [nerdle_input_col]
    MOV AH, 02h
    XOR BH, BH
    INT 10h

    MOV AH, 09h
    MOV AL, ' '
    MOV BH, 0
    MOV BL, 07h
    MOV CX, 40
    INT 10h

    MOV DH, [nerdle_input_row]
    MOV DL, [nerdle_input_col]
    MOV AH, 02h
    XOR BH, BH
    INT 10h

    MOV BYTE [nerdle_len], 0
    MOV CX, 8
    XOR BX, BX
.clear_buf:
    MOV BYTE [user_equation + BX], ' '
    INC BX
    LOOP .clear_buf

    JMP EXPERT_INPUT_LOOP

VERIFY_NERDLE_SYNTAX:
    PUSH AX
    PUSH BX
    PUSH CX
    PUSH DX
    PUSH SI
    PUSH DI

    MOV BYTE [eq_index], 0FFh
    XOR BX, BX
    XOR SI, SI
    MOV CX, 8
.find_equals:
    CMP BYTE [user_equation + SI], '='
    JNE .find_equals_next
    INC BL
    CMP BL, 1
    JNE .find_equals_next
    MOV AX, SI
    MOV [eq_index], AL
.find_equals_next:
    INC SI
    LOOP .find_equals
    CMP BL, 1
    JNE .invalid
    MOV AL, [eq_index]
    CMP AL, 0
    JE .invalid
    CMP AL, 7
    JAE .invalid

    MOV WORD [rhs_val], 0
    MOV BYTE [digit_seen], 0
    MOV AL, [eq_index]
    INC AL
    MOV [parse_pos], AL
.rhs_loop:
    CMP BYTE [parse_pos], 8
    JAE .rhs_done
    XOR BX, BX
    MOV BL, [parse_pos]
    MOV AL, [user_equation + BX]
    CMP AL, '0'
    JB .invalid
    CMP AL, '9'
    JA .invalid
    SUB AL, '0'
    XOR AH, AH
    MOV [digit_val], AX
    MOV AX, [rhs_val]
    MOV BX, 10
    MUL BX
    OR DX, DX
    JNZ .invalid
    ADD AX, [digit_val]
    JC .invalid
    MOV [rhs_val], AX
    MOV BYTE [digit_seen], 1
    INC BYTE [parse_pos]
    JMP .rhs_loop
.rhs_done:
    CMP BYTE [digit_seen], 1
    JNE .invalid

    MOV WORD [lhs_val], 0
    MOV WORD [term_val], 0
    MOV WORD [number_val], 0
    MOV BYTE [pending_sign], '+'
    MOV BYTE [pending_mul], 0
    MOV BYTE [parse_pos], 0

.lhs_next:
    MOV AL, [parse_pos]
    CMP AL, [eq_index]
    JE .lhs_at_equals
    XOR BX, BX
    MOV BL, [parse_pos]
    MOV AL, [user_equation + BX]
    CMP AL, '0'
    JB .lhs_operator
    CMP AL, '9'
    JA .lhs_operator

    MOV WORD [number_val], 0
.number_loop:
    MOV AL, [parse_pos]
    CMP AL, [eq_index]
    JE .number_done
    XOR BX, BX
    MOV BL, [parse_pos]
    MOV AL, [user_equation + BX]
    CMP AL, '0'
    JB .number_done
    CMP AL, '9'
    JA .number_done
    SUB AL, '0'
    XOR AH, AH
    MOV [digit_val], AX
    MOV AX, [number_val]
    MOV BX, 10
    MUL BX
    OR DX, DX
    JNZ .invalid
    ADD AX, [digit_val]
    JC .invalid
    MOV [number_val], AX
    INC BYTE [parse_pos]
    JMP .number_loop

.number_done:
    MOV BYTE [digit_seen], 1
    CMP BYTE [pending_mul], 0
    JE .set_term
    MOV AX, [term_val]
    MOV BX, [number_val]
    CMP BYTE [pending_mul], '*'
    JE .multiply_term
    CMP BX, 0
    JE .invalid
    XOR DX, DX
    DIV BX
    MOV [term_val], AX
    MOV BYTE [pending_mul], 0
    JMP .lhs_next
.multiply_term:
    MUL BX
    OR DX, DX
    JNZ .invalid
    MOV [term_val], AX
    MOV BYTE [pending_mul], 0
    JMP .lhs_next
.set_term:
    MOV AX, [number_val]
    MOV [term_val], AX
    JMP .lhs_next

.lhs_operator:
    CMP BYTE [digit_seen], 1
    JNE .invalid
    CMP AL, '*'
    JE .set_multiply
    CMP AL, '/'
    JE .set_divide
    CMP AL, '+'
    JE .commit_plus
    CMP AL, '-'
    JE .commit_minus
    JMP .invalid
.set_multiply:
    MOV BYTE [pending_mul], '*'
    MOV BYTE [digit_seen], 0
    INC BYTE [parse_pos]
    JMP .lhs_next
.set_divide:
    MOV BYTE [pending_mul], '/'
    MOV BYTE [digit_seen], 0
    INC BYTE [parse_pos]
    JMP .lhs_next
.commit_plus:
    CALL .commit_term
    MOV BYTE [pending_sign], '+'
    MOV BYTE [digit_seen], 0
    INC BYTE [parse_pos]
    JMP .lhs_next
.commit_minus:
    CALL .commit_term
    MOV BYTE [pending_sign], '-'
    MOV BYTE [digit_seen], 0
    INC BYTE [parse_pos]
    JMP .lhs_next

.lhs_at_equals:
    CMP BYTE [digit_seen], 1
    JNE .invalid
    CMP BYTE [pending_mul], 0
    JNE .invalid
    CALL .commit_term
    MOV AX, [lhs_val]
    CMP AX, [rhs_val]
    JNE .invalid
.valid:
    CLC
    JMP .done
.invalid:
    STC
.done:
    POP DI
    POP SI
    POP DX
    POP CX
    POP BX
    POP AX
    RET

.commit_term:
    MOV AX, [term_val]
    CMP BYTE [pending_sign], '-'
    JE .subtract_term
    ADD [lhs_val], AX
    JNC .commit_done
    ADD SP, 2
    JMP .invalid
.commit_done:
    RET
.subtract_term:
    SUB [lhs_val], AX
    JNC .commit_done
    ADD SP, 2
    JMP .invalid
    RET

EVALUATE_NERDLE_ROW:
    PUSH AX
    PUSH BX
    PUSH CX
    PUSH DX
    PUSH SI
    PUSH DI

    CLD
    MOV DI, tile_status
    MOV CX, 8
    XOR AL, AL
    REP STOSB
    MOV DI, target_matched
    MOV CX, 8
    XOR AL, AL
    REP STOSB

    XOR SI, SI
    MOV CX, 8
.green_pass:
    MOV AL, [user_equation + SI]
    CMP AL, [target_equation + SI]
    JNE .green_next
    MOV BYTE [tile_status + SI], 2
    MOV BYTE [target_matched + SI], 1
.green_next:
    INC SI
    LOOP .green_pass

    XOR SI, SI
    MOV CX, 8
.yellow_outer:
    CMP BYTE [tile_status + SI], 2
    JE .yellow_next
    XOR DI, DI
.yellow_inner:
    CMP BYTE [target_matched + DI], 1
    JE .yellow_scan_next
    MOV AL, [user_equation + SI]
    CMP AL, [target_equation + DI]
    JNE .yellow_scan_next
    MOV BYTE [tile_status + SI], 1
    MOV BYTE [target_matched + DI], 1
    JMP .yellow_next
.yellow_scan_next:
    INC DI
    CMP DI, 8
    JB .yellow_inner
.yellow_next:
    INC SI
    LOOP .yellow_outer

    POP DI
    POP SI
    POP DX
    POP CX
    POP BX
    POP AX
    RET

CHECK_NERDLE_WIN:
    PUSH BX
    PUSH CX
    PUSH DX
    PUSH SI

    MOV AL, 1
    XOR SI, SI
    MOV CX, 8
.check_tiles:
    CMP BYTE [tile_status + SI], 2
    JNE .not_win
    INC SI
    LOOP .check_tiles
    JMP .done
.not_win:
    XOR AL, AL
.done:
    POP SI
    POP DX
    POP CX
    POP BX
    RET

RENDER_NERDLE_ROW:
    PUSH AX
    PUSH BX
    PUSH CX
    PUSH DX
    PUSH SI
    PUSH DI

    MOV AH, 03h
    XOR BH, BH
    INT 10h
    DEC DH
    MOV [expert_render_row], DH

    XOR DL, DL
    MOV AH, 02h
    INT 10h
    MOV AH, 09h
    MOV AL, ' '
    MOV BL, 07h
    MOV CX, 80
    INT 10h

    XOR SI, SI
.render_tile:
    MOV AX, SI
    MOV BX, 5
    MUL BX
    ADD AX, 12
    MOV DL, AL
    MOV DH, [expert_render_row]
    MOV BL, 07h
    CMP BYTE [tile_status + SI], 2
    JNE .check_yellow
    MOV BL, 2Fh
    JMP .draw_tile
.check_yellow:
    CMP BYTE [tile_status + SI], 1
    JNE .draw_tile
    MOV BL, 6Fh
.draw_tile:
    MOV AH, 02h
    XOR BH, BH
    INT 10h
    MOV AH, 09h
    MOV AL, '['
    MOV CX, 1
    INT 10h
    INC DL
    MOV AH, 02h
    INT 10h
    MOV AH, 09h
    MOV AL, [user_equation + SI]
    MOV CX, 1
    INT 10h
    INC DL
    MOV AH, 02h
    INT 10h
    MOV AH, 09h
    MOV AL, ']'
    MOV CX, 1
    INT 10h
    INC DL
    MOV AH, 02h
    INT 10h
    INC DL
    MOV AH, 09h
    MOV AL, ' '
    MOV CX, 1
    INT 10h

    INC SI
    CMP SI, 8
    JB .render_tile

    POP DI
    POP SI
    POP DX
    POP CX
    POP BX
    POP AX
    RET

PRINT_EXPERT_TARGET:
    PUSH AX
    PUSH BX
    PUSH CX
    PUSH DX
    PUSH SI

    MOV BL, 0Eh
    MOV SI, target_equation
    MOV CX, 8
.print_target:
    MOV DL, [SI]
    MOV AH, 02h
    INT 21h
    INC SI
    LOOP .print_target

    POP SI
    POP DX
    POP CX
    POP BX
    POP AX
    RET

SELECT_MODE:
    CALL INIT_SCREEN

    MOV BL, 0Eh
    MOV DX, msg_mode_top
    CALL PRINT_COLOR

    MOV BL, 0Bh
    MOV DX, msg_mode_menu
    CALL PRINT_COLOR

.wait_key:
    MOV AH, 00h
    INT 16h

    CMP AL, '1'
    JB .wait_key
    CMP AL, '3'
    JA .wait_key

    SUB AL, '0'
    MOV [selected_mode], AL
    CALL SOUND_BOOT_CHIME
    RET

SELECT_DIFFICULTY:
    CALL INIT_SCREEN

    MOV BL, 0Eh
    MOV DX, msg_difficulty_top
    CALL PRINT_COLOR

    MOV BL, 0Bh
    MOV DX, msg_difficulty_menu
    CALL PRINT_COLOR

.wait_key:
    MOV AH, 00h
    INT 16h

    CMP AL, '1'
    JB .wait_key
    CMP AL, '3'
    JA .wait_key

    CMP AL, '1'
    JE .easy
    CMP AL, '2'
    JE .normal

.hard:
    MOV WORD [max_range], 500
    CMP BYTE [selected_mode], 2
    JE .hard_guessing
    MOV WORD [attempts], 5
    JMP .done
.hard_guessing:
    MOV WORD [attempts], 5
    JMP .done

.normal:
    MOV WORD [max_range], 250
    CMP BYTE [selected_mode], 2
    JE .normal_guessing
    MOV WORD [attempts], 7
    JMP .done
.normal_guessing:
    MOV WORD [attempts], 6
    JMP .done

.easy:
    MOV WORD [max_range], 100
    CMP BYTE [selected_mode], 2
    JE .easy_guessing
    MOV WORD [attempts], 9
    JMP .done
.easy_guessing:
    MOV WORD [attempts], 7

.done:
    MOV BYTE [hint_index], 0
    CALL SOUND_BOOT_CHIME
    RET

SEED_TARGET:
    XOR AH, AH
    INT 1Ah

    MOV AX, DX
    MOV DX, CX
    MOV BX, [max_range]
    DIV BX
    INC DX
    MOV [target_num], DX
    RET

GAME_LOOP:
    CMP WORD [attempts], 0
    JE GAME_OVER

    CMP BYTE [selected_mode], 2
    JE .skip_turn_tone
    MOV BX, 1355
    MOV CX, 1
    CALL PLAY_TONE
.skip_turn_tone:

    MOV BL, 0Bh
    MOV DX, msg_attempts
    CALL PRINT_COLOR

    MOV AX, [attempts]
    MOV BL, 0Eh
    CALL PRINT_NUM

    MOV BL, 0Fh
    MOV DX, msg_prompt
    CALL PRINT_COLOR

    MOV DX, input_buffer
    MOV AH, 0Ah
    INT 21h

    CMP BYTE [input_buffer + 2], 1Bh
    JE ABORT_TO_MAIN_MENU
    MOV CL, [input_buffer + 1]
    XOR CH, CH
    CMP CX, 0
    JE INVALID_INPUT

    MOV WORD [user_val], 0
    MOV SI, input_buffer + 2

PARSE_LOOP:
    MOV BL, [SI]
    CMP BL, '0'
    JB INVALID_INPUT
    CMP BL, '9'
    JA INVALID_INPUT

    SUB BL, '0'
    XOR BH, BH

    MOV AX, [user_val]
    MOV DI, 10
    MUL DI
    ADD AX, BX
    MOV [user_val], AX

    CMP AX, [max_range]
    JA OUT_OF_RANGE

    INC SI
    LOOP PARSE_LOOP

    MOV AX, [user_val]
    CMP AX, 1
    JB OUT_OF_RANGE

    MOV AX, [user_val]
    CMP AX, [target_num]
    JE VICTORY
    JL GUESS_LOW
    JG GUESS_HIGH

GUESS_LOW:
    MOV BL, 0Eh
    MOV DX, msg_low
    CALL PRINT_COLOR

    CMP BYTE [selected_mode], 2
    JE .guessing_low
    CALL SOUND_SWEEP_UP
    CALL SONAR_PROXIMITY_ENGINE
    JMP .low_done
.guessing_low:
    CALL DISPLAY_GUESSING_HINT
.low_done:

    DEC WORD [attempts]
    JMP GAME_LOOP

GUESS_HIGH:
    MOV BL, 0Dh
    MOV DX, msg_high
    CALL PRINT_COLOR

    CMP BYTE [selected_mode], 2
    JE .guessing_high
    CALL SOUND_SWEEP_DOWN
    CALL SONAR_PROXIMITY_ENGINE
    JMP .high_done
.guessing_high:
    CALL DISPLAY_GUESSING_HINT
.high_done:

    DEC WORD [attempts]
    JMP GAME_LOOP

INVALID_INPUT:
    MOV BL, 0Ch
    MOV DX, msg_err_char
    CALL PRINT_COLOR
    CMP BYTE [selected_mode], 2
    JE .invalid_done
    CALL SOUND_ERROR_BUZZ
.invalid_done:
    JMP GAME_LOOP

OUT_OF_RANGE:
    MOV BL, 0Ch
    MOV DX, msg_err_range
    CALL PRINT_COLOR
    CMP BYTE [selected_mode], 2
    JE .range_done
    CALL SOUND_ERROR_BUZZ
.range_done:
    JMP GAME_LOOP

DISPLAY_GUESSING_HINT:
    PUSH AX
    PUSH BX
    PUSH CX
    PUSH DX
    PUSH SI
    PUSH DI

    XOR AX, AX
    MOV AL, [hint_index]
    CMP AL, 0
    JE .parity
    CMP AL, 1
    JE .divisibility
    CMP AL, 2
    JE .tens_digit
    JMP .digit_sum

.parity:
    MOV AX, [target_num]
    TEST AX, 1
    JZ .even
    MOV BL, 0Eh
    MOV DX, msg_hint_odd
    CALL PRINT_COLOR
    JMP .next_hint
.even:
    MOV BL, 0Eh
    MOV DX, msg_hint_even
    CALL PRINT_COLOR
    JMP .next_hint

.divisibility:
    MOV AX, [target_num]
    XOR DX, DX
    MOV BX, 3
    DIV BX
    CMP DX, 0
    JE .divisible_by_3

    MOV AX, [target_num]
    XOR DX, DX
    MOV BX, 5
    DIV BX
    CMP DX, 0
    JE .divisible_by_5

    MOV AX, [target_num]
    XOR DX, DX
    MOV BX, 7
    DIV BX
    CMP DX, 0
    JE .divisible_by_7

    MOV BL, 0Bh
    MOV DX, msg_hint_not_divisible
    CALL PRINT_COLOR
    JMP .next_hint
.divisible_by_3:
    MOV BL, 0Bh
    MOV DX, msg_hint_divisible_3
    CALL PRINT_COLOR
    JMP .next_hint
.divisible_by_5:
    MOV BL, 0Bh
    MOV DX, msg_hint_divisible_5
    CALL PRINT_COLOR
    JMP .next_hint
.divisible_by_7:
    MOV BL, 0Bh
    MOV DX, msg_hint_divisible_7
    CALL PRINT_COLOR
    JMP .next_hint

.tens_digit:
    MOV AX, [target_num]
    XOR DX, DX
    MOV BX, 10
    DIV BX
    CMP AX, 2
    JE .prime_tens
    CMP AX, 3
    JE .prime_tens
    CMP AX, 5
    JE .prime_tens
    CMP AX, 7
    JE .prime_tens
    MOV BL, 0Eh
    MOV DX, msg_hint_not_prime_tens
    CALL PRINT_COLOR
    JMP .next_hint
.prime_tens:
    MOV BL, 0Eh
    MOV DX, msg_hint_prime_tens
    CALL PRINT_COLOR
    JMP .next_hint

.digit_sum:
    MOV AX, [target_num]
    XOR DX, DX
    MOV BX, 10
    DIV BX
    ADD AX, DX
    TEST AX, 1
    JZ .even_digit_sum
    MOV BL, 0Eh
    MOV DX, msg_hint_odd_digit_sum
    CALL PRINT_COLOR
    JMP .next_hint
.even_digit_sum:
    MOV BL, 0Eh
    MOV DX, msg_hint_even_digit_sum
    CALL PRINT_COLOR

.next_hint:
    INC BYTE [hint_index]
    CMP BYTE [hint_index], 4
    JB .done
    MOV BYTE [hint_index], 0

.done:
    POP DI
    POP SI
    POP DX
    POP CX
    POP BX
    POP AX
    RET

VICTORY:
    MOV BL, 0Ah
    MOV DX, msg_win
    CALL PRINT_COLOR

    MOV AX, [target_num]
    CALL PRINT_NUM

    MOV BL, 0Ah
    MOV DX, msg_footer
    CALL PRINT_COLOR

    CMP BYTE [selected_mode], 2
    JE .victory_done
    CALL SOUND_VICTORY_FANFARE
.victory_done:
    JMP ASK_REPLAY

GAME_OVER:
    MOV BL, 0Ch
    MOV DX, msg_lose
    CALL PRINT_COLOR

    MOV AX, [target_num]
    CALL PRINT_NUM

    MOV BL, 0Ch
    MOV DX, msg_footer
    CALL PRINT_COLOR

    CMP BYTE [selected_mode], 2
    JE .game_over_done
    CALL SOUND_DEFEAT_TONE
.game_over_done:

ASK_REPLAY:
    MOV BL, 0Eh
    MOV DX, msg_replay
    CALL PRINT_COLOR

    MOV AH, 01h
    INT 21h

    CMP AL, 'Y'
    JE MAIN_MENU
    CMP AL, 'y'
    JE MAIN_MENU

    MOV BL, 0Bh
    MOV DX, msg_goodbye
    CALL PRINT_COLOR

    MOV AX, 4C00h
    INT 21h

ABORT_TO_MAIN_MENU:
    IN AL, 61h
    AND AL, 0FCh
    OUT 61h, AL

    MOV WORD [attempts], 7
    MOV BYTE [nerdle_len], 0
    MOV BYTE [current_row], 0
    MOV BYTE [hint_index], 0
    MOV BYTE [input_buffer + 1], 0
    MOV WORD [user_val], 0
    MOV WORD [target_num], 0

    MOV SP, 0FFFEh
    JMP MAIN_MENU

SONAR_PROXIMITY_ENGINE:
    PUSH AX
    PUSH BX
    PUSH CX
    PUSH DX
    PUSH SI

    MOV AX, [target_num]
    SUB AX, [user_val]
    JNS .abs_done
    NEG AX
.abs_done:
    MOV [delta_val], AX

    MOV BX, 25
    MUL BX
    ADD AX, 700
    MOV [ping_div], AX

    MOV AX, [delta_val]
    CMP AX, 5
    JBE .tier_critical
    CMP AX, 15
    JBE .tier_strong
    CMP AX, 35
    JBE .tier_moderate
    JMP .tier_distant

.tier_critical:
    MOV BL, 0Ah
    MOV DX, msg_sonar_t4
    CALL PRINT_COLOR
    MOV WORD [ping_gap], 1
    JMP .emit_pings

.tier_strong:
    MOV BL, 0Eh
    MOV DX, msg_sonar_t3
    CALL PRINT_COLOR
    MOV WORD [ping_gap], 2
    JMP .emit_pings

.tier_moderate:
    MOV BL, 0Bh
    MOV DX, msg_sonar_t2
    CALL PRINT_COLOR
    MOV WORD [ping_gap], 3
    JMP .emit_pings

.tier_distant:
    MOV BL, 07h
    MOV DX, msg_sonar_t1
    CALL PRINT_COLOR
    MOV WORD [ping_gap], 5

.emit_pings:
    MOV SI, 3
.ping_loop:
    MOV BX, [ping_div]
    MOV CX, 1
    CALL PLAY_TONE

    MOV CX, [ping_gap]
    CALL WAIT_TICKS

    DEC SI
    JNZ .ping_loop

    POP SI
    POP DX
    POP CX
    POP BX
    POP AX
    RET

PLAY_TONE:
    PUSH AX
    PUSH BX
    PUSH CX
    PUSH DX

    MOV AL, 0B6h
    OUT 43h, AL

    MOV AX, BX
    OUT 42h, AL
    MOV AL, AH
    OUT 42h, AL

    IN AL, 61h
    OR AL, 03h
    OUT 61h, AL

    CALL WAIT_TICKS

    IN AL, 61h
    AND AL, 0FCh
    OUT 61h, AL

    POP DX
    POP CX
    POP BX
    POP AX
    RET

WAIT_TICKS:
    PUSH AX
    PUSH BX
    PUSH CX
    PUSH DX
    PUSH SI

    MOV SI, CX
    XOR AH, AH
    INT 1Ah
    MOV BX, DX

.wait_loop:
    XOR AH, AH
    INT 1Ah
    SUB DX, BX
    CMP DX, SI
    JB .wait_loop

    POP SI
    POP DX
    POP CX
    POP BX
    POP AX
    RET

SOUND_BOOT_CHIME:
    MOV BX, 2280
    MOV CX, 1
    CALL PLAY_TONE
    MOV BX, 1521
    MOV CX, 2
    CALL PLAY_TONE
    RET

SOUND_SWEEP_UP:
    MOV BX, 2983
    MOV CX, 1
    CALL PLAY_TONE
    MOV BX, 1988
    MOV CX, 1
    CALL PLAY_TONE
    MOV CX, 1
    CALL WAIT_TICKS
    RET

SOUND_SWEEP_DOWN:
    MOV BX, 1491
    MOV CX, 1
    CALL PLAY_TONE
    MOV BX, 2386
    MOV CX, 1
    CALL PLAY_TONE
    MOV CX, 1
    CALL WAIT_TICKS
    RET

SOUND_ERROR_BUZZ:
    MOV BX, 5423
    MOV CX, 1
    CALL PLAY_TONE
    MOV CX, 1
    CALL WAIT_TICKS
    MOV BX, 7231
    MOV CX, 2
    CALL PLAY_TONE
    RET

SOUND_VICTORY_FANFARE:
    MOV BX, 2280
    MOV CX, 1
    CALL PLAY_TONE
    MOV BX, 1809
    MOV CX, 1
    CALL PLAY_TONE
    MOV BX, 1521
    MOV CX, 1
    CALL PLAY_TONE
    MOV BX, 1140
    MOV CX, 4
    CALL PLAY_TONE
    RET

SOUND_DEFEAT_TONE:
    MOV BX, 2711
    MOV CX, 2
    CALL PLAY_TONE
    MOV BX, 3615
    MOV CX, 2
    CALL PLAY_TONE
    MOV BX, 5423
    MOV CX, 4
    CALL PLAY_TONE
    RET

INIT_SCREEN:
    PUSH AX
    PUSH BX
    PUSH CX
    PUSH DX

    MOV AX, 0003h
    INT 10h

    MOV AX, 0600h
    MOV BH, 07h
    XOR CX, CX
    MOV DX, 184Fh
    INT 10h

    MOV AH, 02h
    XOR BH, BH
    XOR DX, DX
    INT 10h

    POP DX
    POP CX
    POP BX
    POP AX
    RET

PRINT_COLOR:
    PUSH AX
    PUSH BX
    PUSH CX
    PUSH DX
    PUSH SI

    MOV SI, DX
    XOR BH, BH

.next_char:
    MOV AL, [SI]
    CMP AL, '$'
    JE .done

    CMP AL, 0Dh
    JE .control_char
    CMP AL, 0Ah
    JE .control_char

    MOV AH, 09h
    MOV CX, 1
    INT 10h

.control_char:
    MOV AH, 0Eh
    INT 10h

    INC SI
    JMP .next_char

.done:
    POP SI
    POP DX
    POP CX
    POP BX
    POP AX
    RET

PRINT_NUM:
    PUSH AX
    PUSH BX
    PUSH CX
    PUSH DX

    XOR CX, CX
    MOV BX, 10

.DIVIDE_DIGITS:
    XOR DX, DX
    DIV BX
    PUSH DX
    INC CX
    TEST AX, AX
    JNZ .DIVIDE_DIGITS

.OUTPUT_DIGITS:
    POP DX
    ADD DL, '0'
    MOV AH, 02h
    INT 21h
    LOOP .OUTPUT_DIGITS

    POP DX
    POP CX
    POP BX
    POP AX
    RET

SECTION .data

target_num      DW 0
user_val        DW 0
attempts        DW 7
max_range       DW 100
selected_mode   DB 1
hint_index      DB 0
current_row     DB 0
nerdle_input_row DB 0
nerdle_input_col DB 0
delta_val       DW 0
ping_div        DW 1000
ping_gap        DW 2
tmp_char        DB '0', '$'

input_buffer    DB 5, 0, 0, 0, 0, 0, 0
nerdle_len      DB 0
eq_index        DB 0
parse_pos       DB 0
digit_seen      DB 0
pending_sign    DB '+'
pending_mul     DB 0
digit_val       DW 0
number_val      DW 0
term_val        DW 0
lhs_val         DW 0
rhs_val         DW 0
user_equation   DB 8 DUP(' ')
target_equation DB 8 DUP(' ')
tile_status     DB 8 DUP(0)
target_matched  DB 8 DUP(0)
expert_render_row DB 0

eq_pool         DB '12+34=46'
                DB '23+45=68'
                DB '56+21=77'
                DB '87-12=75'
                DB '98-23=75'
                DB '84/7=012'
                DB '96/8=012'
                DB '27+18=45'
                DB '64-21=43'
                DB '35+42=77'
                DB '76-24=52'
                DB '65-31=34'

msg_mode_top    DB 0Dh, 0Ah, ' ', 0C9h
                TIMES 66 DB 0CDh
                DB 0BBh, 0Dh, 0Ah, '$'

msg_mode_menu   DB ' ', 0BAh, '  SELECT OPERATION MODE                                      ', 0BAh, 0Dh, 0Ah
                DB ' ', 0BAh, '  [1] Assisted Mode                                         ', 0BAh, 0Dh, 0Ah
                DB ' ', 0BAh, '  [2] Guessing Mode                                         ', 0BAh, 0Dh, 0Ah
                DB ' ', 0BAh, '  [3] Expert Guessing Mode                                  ', 0BAh, 0Dh, 0Ah
                DB ' ', 0C8h
                TIMES 66 DB 0CDh
                DB 0BCh, 0Dh, 0Ah, '$'

msg_difficulty_top DB 0Dh, 0Ah, ' ', 0C9h
                   TIMES 66 DB 0CDh
                   DB 0BBh, 0Dh, 0Ah, '$'

msg_difficulty_menu DB ' ', 0BAh, '  SELECT SPECTRUM RANGE                                      ', 0BAh, 0Dh, 0Ah
                    DB ' ', 0BAh, '  [1] Easy       (0 - 100 | 9 Attempts)                    ', 0BAh, 0Dh, 0Ah
                    DB ' ', 0BAh, '  [2] Normal     (0 - 250 | 7 Attempts)                    ', 0BAh, 0Dh, 0Ah
                    DB ' ', 0BAh, '  [3] Hard       (0 - 500 | 5 Attempts)                    ', 0BAh, 0Dh, 0Ah
                    DB ' ', 0C8h
                    TIMES 66 DB 0CDh
                    DB 0BCh, 0Dh, 0Ah, '$'

msg_header_top  DB 0Dh, 0Ah, ' ', 0C9h
                TIMES 66 DB 0CDh
                DB 0BBh, 0Dh, 0Ah, '$'

msg_header_title DB ' ', 0BAh, '  SONAR-X86: ACOUSTIC NUMBER GUESSING SYSTEM [PIT AUDIO]        ', 0BAh, 0Dh, 0Ah, '$'

msg_header_bot  DB ' ', 0C8h
                TIMES 66 DB 0CDh
                DB 0BCh, 0Dh, 0Ah, '$'

msg_rules       DB '  [ACCESSIBILITY MODE: ACTIVE] 8254 PIT Hardware Sonar Enabled.', 0Dh, 0Ah
                DB '  * Ascend Sweep = Too Low (Aim Higher) | Descend Sweep = Too High', 0Dh, 0Ah
                DB '  * Faster & Higher Sonar Pings = Closer to Secret Target', 0Dh, 0Ah, '$'

msg_attempts    DB 0Dh, 0Ah, '  [Attempts Left: $'
msg_prompt      DB '] Enter your guess (1-selected max): $'

msg_low         DB 0Dh, 0Ah, '  >> [-] TOO LOW!  Try a higher number. (Ascending Sweep)', 0Dh, 0Ah, '$'
msg_high        DB 0Dh, 0Ah, '  >> [+] TOO HIGH! Try a lower number.  (Descending Sweep)', 0Dh, 0Ah, '$'

msg_hint_even            DB 0Dh, 0Ah, '  [HINT] The target number is: EVEN', 0Dh, 0Ah, '$'
msg_hint_odd             DB 0Dh, 0Ah, '  [HINT] The target number is: ODD', 0Dh, 0Ah, '$'
msg_hint_divisible_3     DB 0Dh, 0Ah, '  [HINT] Secret number is divisible by 3', 0Dh, 0Ah, '$'
msg_hint_divisible_5     DB 0Dh, 0Ah, '  [HINT] Secret number is divisible by 5', 0Dh, 0Ah, '$'
msg_hint_divisible_7     DB 0Dh, 0Ah, '  [HINT] Secret number is divisible by 7', 0Dh, 0Ah, '$'
msg_hint_not_divisible   DB 0Dh, 0Ah, '  [HINT] Secret number is NOT divisible by 3, 5, or 7', 0Dh, 0Ah, '$'
msg_hint_prime_tens      DB 0Dh, 0Ah, '  [HINT] Tens digit is a PRIME number', 0Dh, 0Ah, '$'
msg_hint_not_prime_tens  DB 0Dh, 0Ah, '  [HINT] Tens digit is NOT prime', 0Dh, 0Ah, '$'
msg_hint_even_digit_sum  DB 0Dh, 0Ah, '  [HINT] Sum of digits is EVEN', 0Dh, 0Ah, '$'
msg_hint_odd_digit_sum   DB 0Dh, 0Ah, '  [HINT] Sum of digits is ODD', 0Dh, 0Ah, '$'

msg_sonar_t4    DB '     SONAR PROXIMITY: ['
                TIMES 10 DB 0DBh
                DB '] CRITICAL LOCK! (Delta <= 5)', 0Dh, 0Ah, '$'

msg_sonar_t3    DB '     SONAR PROXIMITY: ['
                TIMES 8 DB 0DBh
                TIMES 2 DB 0B0h
                DB '] STRONG ECHO    (Delta <= 15)', 0Dh, 0Ah, '$'

msg_sonar_t2    DB '     SONAR PROXIMITY: ['
                TIMES 5 DB 0DBh
                TIMES 5 DB 0B0h
                DB '] MODERATE ECHO  (Delta <= 35)', 0Dh, 0Ah, '$'

msg_sonar_t1    DB '     SONAR PROXIMITY: ['
                TIMES 2 DB 0DBh
                TIMES 8 DB 0B0h
                DB '] DISTANT ECHO   (Delta > 35)', 0Dh, 0Ah, '$'

msg_err_char    DB 0Dh, 0Ah, '  >> [!] ERROR: Invalid input! Please enter digits only.', 0Dh, 0Ah, '$'
msg_err_range   DB 0Dh, 0Ah, '  >> [!] ERROR: Out of range! Enter a value from 1 to the selected maximum.', 0Dh, 0Ah, '$'

msg_win         DB 0Dh, 0Ah, ' ', 0C9h
                TIMES 66 DB 0CDh
                DB 0BBh, 0Dh, 0Ah
                DB ' ', 0BAh, '  [*] TARGET LOCKED! CORRECT! You guessed the secret number: $'

msg_lose        DB 0Dh, 0Ah, ' ', 0C9h
                TIMES 66 DB 0CDh
                DB 0BBh, 0Dh, 0Ah
                DB ' ', 0BAh, '  [X] GAME OVER! You ran out of attempts. Secret number was: $'

msg_footer      DB 0Dh, 0Ah, ' ', 0C8h
                TIMES 66 DB 0CDh
                DB 0BCh, 0Dh, 0Ah, '$'

msg_replay      DB 0Dh, 0Ah, '  Play again? (Y/N): $'
msg_goodbye     DB 0Dh, 0Ah, '  Thank you for playing SONAR-X86! Returning to DOS...', 0Dh, 0Ah, '$'

msg_expert_title DB 'SONAR-X86: EXPERT EQUATION DEFUSAL (NERDLE PROTOCOL)', 0Dh, 0Ah, '$'
msg_expert_rules DB 'Enter an 8-character equation using digits and + - * / =.', 0Dh, 0Ah
                 DB 'Exact matches glow green; misplaced characters glow yellow.', 0Dh, 0Ah, '$'
msg_expert_prompt DB 'ROW $'
msg_expert_separator DB '/6 > $'
msg_expert_win   DB 0Dh, 0Ah, '[*] EQUATION DEFUSED! Rows used: $'
msg_expert_lose  DB 0Dh, 0Ah, '[-] TARGET UNRESOLVED. Formula was: $'
msg_invalid_eq  DB '[!] INVALID EQUATION: Must be mathematically true with "="!$'
