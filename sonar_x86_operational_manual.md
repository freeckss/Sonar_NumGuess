# SONAR-X86: OPERATIONAL MANUAL & ARCHITECTURAL SPECIFICATION

```
  ██████╗  ██████╗ ███╗   ██╗ █████╗ ██████╗       ██╗  ██╗ █████╗  ██████╗ 
  ██╔════╝ ██╔═══██╗████╗  ██║██╔══██╗██╔══██╗      ╚██╗██╔╝██╔══██╗██╔════╝ 
  ███████╗ ██║   ██║██╔██╗ ██║███████║██████╔╝█████╗ ╚███╔╝ ╚█████╔╝███████╗ 
  ╚════██║ ██║   ██║██║╚██╗██║██╔══██║██╔══██╗╚════╝ ██╔██╗ ██╔══██╗╚════██║ 
  ███████║ ╚██████╔╝██║ ╚████║██║  ██║██║  ██║      ██╔╝ ██╗╚█████╔╝███████║ 
  ╚══════╝  ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝      ╚═╝  ╚═╝ ╚════╝  ╚══════╝ 
```

**SONAR-X86** is an acoustic, deductive, and mathematical defusal game engineered in 16-bit real-mode x86 assembly (NASM) for MS-DOS systems. The game interfaces directly with the Intel 8254 Programmable Interval Timer (PIT) and standard BIOS interrupts to provide tactile auditory feedback, analytical mathematical hints, and symbolic equation evaluation.

---

## 1. Quick Start & Execution

### Prerequisites
* **NASM (Netwide Assembler):** Installed via WSL (`sudo apt install nasm`) or natively on Windows.
* **DOSBox / DOSBox-X:** Configured to emulate an IBM-compatible PC with Sound Blaster / PC Speaker audio.

### Assembling the Flat Binary
Assemble `sonar.asm` into a flat `.COM` executable using NASM:
```bash
wsl nasm -f bin sonar.asm -o sonar.com
```

### Launching in DOSBox
Mount your project directory as virtual drive `C:` and launch the binary:
```dos
Z:\> MOUNT C "C:\Users\Alik David\Sonar_NumGuess"
Z:\> C:
C:\> SONAR.COM
```

### Unified Single-Command VS Code Build & Run
From the integrated terminal in VS Code (PowerShell), execute the pipeline with one keystroke:
```powershell
wsl nasm -f bin sonar.asm -o sonar.com; & "C:\Program Files (x86)\DOSBox-0.74-3\DOSBox.exe" -c "mount c ." -c "c:" -c "sonar.com"
```

---

## 2. Controls & Keyboard Mapping

| Key | Interface Screen | Functional Behavior |
| :--- | :--- | :--- |
| **`1` – `3`** | Main Selection Menu | Select active game mode (Assisted, Guessing, Expert). |
| **`1` – `3`** | Difficulty Window | Select range and attempt budget (Easy, Normal, Hard). |
| **`0` – `9`** | In-Game Play | Input numerical digits into the input buffer. |
| **`+` `-` `*` `/` `=`** | Mode 3 (Expert) | Input arithmetic operators and equals delimiter. |
| **`Backspace` (`08h`)** | In-Game Play | Delete preceding character and step cursor back. |
| **`Enter` (`0Dh`)** | In-Game Play | Submit guess or evaluate active equation row. |
| **`Esc` (`1Bh`)** | Any Screen | **Emergency Abort:** Immediately silences PIT speaker output, resets stack pointer (`SP = 0FFFEh`), and returns to Main Menu. |

---

## 3. Operational Game Modes

### Mode 1: Assisted Mode (Acoustic Sonar)
Locate an unknown target number using directional frequency sweeps and auditory distance metrics powered by PIT Channel 2 (Ports `42h` and `61h`).

* **Directional Sweeps:**
  * **Ascending Sweep:** Current guess is **TOO LOW** (target is greater).
  * **Descending Sweep:** Current guess is **TOO HIGH** (target is lesser).
* **Sonar Proximity Engine:** The tone frequency and ping repetition rate scale proportionally as the absolute distance $\Delta = |\text{guess} - \text{target}|$ approaches zero.
* **Attempt Allowances:**
  * **Easy:** 9 Attempts
  * **Normal:** 7 Attempts
  * **Hard:** 5 Attempts

---

### Mode 2: Tactical Guessing Mode (Deductive Clues)
Audio sweeps and proximity tones are suppressed, shifting gameplay toward numerical deduction.

* **Directional Prompts:** Real-time textual feedback (`TOO LOW` / `TOO HIGH`) remains active.
* **Rotational Hint Engine:** Each incorrect attempt evaluates the hidden target and presents a diagnostic property:
  1. **Parity Inspection:** Evaluates bit 0 of the target via `TEST AX, 1` to report whether the value is **EVEN** or **ODD**.
  2. **Divisibility Check:** Evaluates divisibility against primes 3, 5, and 7 using integer modulo arithmetic.
  3. **Tens Digit Analysis:** Isolates the tens place ($\lfloor\text{target} / 10\rfloor$) and checks if the digit is a prime number ($\{2, 3, 5, 7\}$).
  4. **Sum of Digits / Spectrum Bracket:** Determines digit sum parity or states which quartile of the spectrum ($\frac{1}{4}$, $\frac{1}{2}$, $\frac{3}{4}$) contains the target.
* **Attempt Allowances:**
  * **Easy:** 7 Attempts
  * **Normal:** 6 Attempts
  * **Hard:** 5 Attempts

---

### Mode 3: Expert Mode (Nerdle Protocol)
An 8-character mathematical deduction puzzle where the player must uncover an undisclosed valid formula within 6 rows.

```
  ROW 1/6 > [4] [5] [+] [3] [6] [=] [8] [1]
```

#### Tile Color Coding (BIOS Video Attribute Byte)
* **Green (`2Fh` - Green BG, Bright White FG):** Character matches the secret equation in identity and exact index.
* **Yellow / Brown (`6Fh` - Brown BG, Bright White FG):** Character exists within the secret equation, but occupies a different position.
* **Black (`07h` - Black BG, Standard Grey FG):** Character is completely absent from the formula.

#### Mathematical Verification Engine
When `Enter` is pressed, the input is submitted to `VERIFY_NERDLE_SYNTAX` prior to evaluation:
1. **Length Check:** Input must contain exactly 8 ASCII characters.
2. **Delimiter Check:** Exactly one equals sign (`=`) must be present, situated strictly between indices 1 and 6.
3. **Equivalence Validation:** The expression on the Left-Hand Side (LHS) is evaluated and compared against the scalar integer parsed on the Right-Hand Side (RHS):
   $$\text{Result}_{\text{LHS}} = \text{Value}_{\text{RHS}}$$
4. **Non-Destructive Error Handling:** Syntactically invalid or mathematically incorrect formulas trigger an alert buzz, display a warning at row 23, and clear the row input without expending one of the 6 attempts.

---

## 4. Technical Architecture

* **Binary Format:** Flat Single-Segment MS-DOS `.COM` file (`ORG 100h`).
* **Processor Target:** Intel 80386+ in 16-bit Real Address Mode.
* **Display Output:** Standard Alphanumeric Mode 03h ($80 \times 25$ characters, 16 colors) accessed via BIOS `INT 10h`.
* **Hardware Timer Audio:** PC Speaker tone control driven by Intel 8254 PIT Channel 2:
  * Frequency Divisor: $F_{\text{divisor}} = \frac{1193180 \text{ Hz}}{F_{\text{target}}}$
  * Port `43h`: Control Word Register (`0B6h` selects Square Wave Mode).
  * Port `42h`: Divisor LSB followed by MSB.
  * Port `61h`: Bit 0 (Gate 2) and Bit 1 (Data) toggled to initiate/terminate sound.
* **Random Entropy Seeding:** Initial pseudo-random seed is derived from BIOS system timer ticks via `INT 1Ah, AH=00h` on application boot.

---

## 5. Troubleshooting Common Issues

* **`Illegal command: sonar.com` in DOSBox:**
  Drive `C:` is pointing to the wrong folder. Unmount and remount the exact folder:
  ```dos
  Z:\> mount -u c
  Z:\> mount c "C:\Users\Alik David\Sonar_NumGuess"
  Z:\> c:
  ```
* **Speaker Sticking / Buzzing Continuously:**
  Press **`Esc`** at any time. The global abort routine masks bits 0 and 1 on hardware port `61h` to force speaker silence.
* **NASM Error: `label changed during code generation`:**
  Occurs when local labels (`.label`) lose their parent scope due to an intervening global symbol. Ensure helper subroutines reside strictly outside loop headers.