import { App, Editor, HexString, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface LangFlashcardsPluginSettings {
	clozeDelimiter: string;
}

const DEFAULT_SETTINGS: LangFlashcardsPluginSettings = {
	// set clozeDelimiter to the string defined by clozeDelimeter in plugin settings
	clozeDelimiter: "highlight"
}

/*
Settings Tab
*/

class LangFlashcardsSettingTab extends PluginSettingTab {
	plugin: LangFlashcardsPlugin;

	constructor(app: App, plugin: LangFlashcardsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my Language flashcard plugin.'});
		// Choose cloze placeholder, so that it matches that used in obsidian-spaced-repetition plugin
		new Setting(containerEl)
			.setName('Cloze Settings')
			.setDesc('Cloze placeholder set in obsidian-spaced-repetition plugin')
			.addDropdown((dropdown) => {
				dropdown
					.addOptions({highlight: "==highlight==", bold: "**bolded**", curly: "{{curly brackets}}"})
					.setValue(this.plugin.settings.clozeDelimiter)
					.onChange(async (value: "highlight" | "bold" | "curly") => {
						console.log("clozeSetting: " + value)
						this.plugin.settings.clozeDelimiter = value;
						await this.plugin.saveSettings();
					})
			});
	}
}


export default class LangFlashcardsPlugin extends Plugin {
	settings: LangFlashcardsPluginSettings;
	auto_translate = false;
	translator;

	// Load settings and store them in the config object. This is called when we have a page
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	// Save the settings.
	async saveSettings() {
		await this.saveData(this.settings);
	}

	// code to run when page is closed
	onunload() {

	}

	// code to run when the page is loaded
	// adds command to command menu and defines them
	async onload() {
		await this.loadSettings();
		this.app.workspace.onLayoutReady(() => {
			// check translator has loaded and is ready
			this.translator = app.plugins.plugins["translate"]?.translator
			if (this.translator && this.translator.valid) {
				this.auto_translate = true;
			}
			//console.log(`translator is ${this.translator}`);
			//console.log(`translator.valid is ${this.translator.valid}`);
			//console.log(`Auto translate is ${this.auto_translate}`);
		});
/* 
		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		}); 
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');
*/
/*
		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');
*/

		// Add 'Create Language Flashcards' command to menu
		// opens modal to allow user to add details
		// insert the contents of the phrase  variable returned by the modal
		// to the bottom of the document and then return the document view back to where it was.
		this.addCommand({
			//define obsidian command
			id: 'open-flashcard-modal',
			name: 'Create Language Flashcards',
			editorCallback: (editor: Editor) => {
				//get current position in editor {line number, character number}
				const currentPosition = editor.getCursor();
				// get position of last line in editor {line number, character number}
				const lastLine = editor.lastLine();
				// add a new line at the end of the last line
				editor.replaceRange("\n",{line: lastLine, ch:editor.getLine(lastLine).length});
				// define function onSubmit passed to the modal
				const onSubmit = (phrase: string) => {
					// move to the beginning  of the blank line
					// just added to the bottom of the editor
					// and replace it with the contents of the phrase variable
					// move the document view back to where it was
					const lastLine = editor.lastLine();
					editor.setSelection({line: lastLine, ch: 0})
					editor.replaceSelection(`${phrase}`);
					editor.setCursor(currentPosition)
				};
			
				// create a new FlashcardModal and present it to the user
				new FlashcardModal(this.app, this.settings, onSubmit).open();
			},
			
		});
		
		/**
		* Extracts sentence from text and returns it as string. The sentence is split by looking for . or ! or ¡ or ? or ¿
		* 
		* @param paragraph - contents of "paragraph" containing selection.
		* @param selection - highlighted word(s) 
		* @param cursor_pos - Position of the cursor in the paragraph
		* 
		* @return { string } Sentence containing the selection
		*/
		function extractSentence(paragraph: string, selection: string, cursor_pos: number): string{
			// check cursor is at end of selection
			let selection_check = paragraph.slice(cursor_pos - selection.length, cursor_pos)
			// Check if the cursor is at wrong end of selection.
			if (selection_check != selection) {
			// cursor must be at beginning of selection
			// so move cursor_pos to end of selection
			cursor_pos += selection.length
			selection_check = paragraph.slice(cursor_pos - selection.length, cursor_pos)
			}
			const para_start = paragraph.slice(0, cursor_pos);
			const para_end: string = paragraph.slice(cursor_pos);
			// split para_start into sentences by looking for .!?
			// return string in last split
			const sentences = para_start.split(/[.!¡?¿/]/g);
			let sentence = sentences[sentences.length-1];
			sentence = sentence.slice(0, sentence.length - selection.length);
			sentence += "==";
			sentence += selection;
			sentence += "=="
			// split para_end into sentences keeping the first sentence found
			const sentence_end = para_end.split(/[.!?]/g)[0]
			sentence += sentence_end;
			// console.log(`paragraph = ${paragraph}`);
			// console.log(`selection = ${selection}`)
			// console.log(`cursor_pos = ${cursor_pos}`);
			return sentence;
		}

		// Define the Obsidian command to create a flashcard from the selection. 
		this.addCommand({
			// define the command
			id: 'create-flashcard-from-selection',
			name: "Create Language Flashcard from Selection",
			// define the callback function to be run when the command is selected
			editorCallback: async (editor: Editor) => {
				const currentPosition = editor.getCursor();
				// create a new line at the end of the document
				const lastLine = editor.lastLine();
				editor.replaceRange("\n",{line: lastLine, ch:editor.getLine(lastLine).length});
				// get the selected word(s)
				const selectedText:string = editor.getSelection();
				//get current paragraph
				const containingSentence = editor.getLine(editor.getCursor().line)
				const cursor_pos = editor.getCursor().ch
				// get the sentence containing the keyword
				const flashcard_sentence = extractSentence(containingSentence, selectedText, cursor_pos);
				// translate the keyword
				const translated_keyword = await this.translator.translate(selectedText, "es", "en");
				// console.log(translated_keyword);
				// define function to run when the user presses the modal submit button
				// Adds the string returned by the modal to the end of the current document and sets the cursor to the position it started from
				const onSubmit = (phrase: string) => {
					const lastLine = editor.lastLine();
					editor.setSelection({line: lastLine, ch: 0})
					editor.replaceSelection(`${phrase}`);
					editor.setCursor(currentPosition);
				};
			
				// create the modal
				new FlashcardsFromSelectionModal(this.app, flashcard_sentence, translated_keyword.translation, this.settings, onSubmit).open();
			}
		})

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new LangFlashcardsSettingTab(this.app, this));
/*
		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});
*/
/*
		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
*/
	}
}


// defines modal to be presented when the command 
// create flashcard from selection is chosen by the user
class FlashcardsFromSelectionModal extends Modal {
	// class variables 
	phrase: string;
	translated_keyword: string
	displayPhrase: string;
	imageLink: string;
	dictForm: string;
	clozeWord: string;
	clozeWordStartPosition: number;
	clozeWordEndPosition: number;
	mySettings: LangFlashcardsPluginSettings
	onSubmit: (phrase: string) => void;

	// class constructor
	constructor(
		// the current app (Obsidian)
		app: App, 
		// a supplied string 
		// (a phrase containing a keyword which is used to create flashcards)
		phrase: string,
		// a translation (into english) of the keyword in the phrase
		translated_keyword: string,
		// the current plugin settings
		settings: LangFlashcardsPluginSettings,
		// an onSubmit function which returns nothing
		onSubmit: (phrase: string) => void

	) {
			// assign the values supplied to the constructor to class variables
			super(app);
			this.phrase = phrase;
			this.translated_keyword = translated_keyword;
			this.mySettings = settings
			this.onSubmit = onSubmit;
		}

	// code to run when the modal is opened
	onOpen() {
		const { contentEl } = this;
  
		contentEl.createEl("h1", { text: "Create flashcard from selection" });
		// Text box to allow entry of flashcard phrase
		// initially filled with supplied phrase
		// if it is changed then it updates the value of the phrase class variable
		new Setting(contentEl)
			.setName("Phrase")
			.addText(text => text
				.setValue(this.phrase)
				.onChange((value) => {
				this.phrase = value
			}));
		
		// Text box to allow entry of image url
		// if it is changed then the imageLink class variable is changed to
		// a string defining an image of width 400 set to the image location supplied
		new Setting(contentEl)
			.setName("Enter image URL:")
			.addText((text) =>
				text.onChange((value) => {
				this.imageLink = "![image|400](" + value + ")";
			})); 
		
		// button which when pressed opens a browser window at giphy with the translated_keyword set as the search term
		new Setting(contentEl).addButton((btn) => btn
			.setButtonText("Browse..")	
			.setCta()
			.onClick(() => {
				window.open(`https://giphy.com/search/${this.translated_keyword}`)
			})
		)
		// text box allowing the user to enter the dictionary form of the keyword
		new Setting(contentEl).setName("Enter dictionary form of keyword:").addText((text) =>
				text.onChange((value) => {
				this.dictForm = value
			})
		); 
		
		// the Submit button
		
		new Setting(contentEl).addButton((btn) => btn
			.setButtonText("Submit")
			.setCta()
			// when clicked
			// closes the modal
			// calls a function to generate the flashcard content
			// supplies the flashcard phrases as a string to the onSubmit function
			.onClick(() => {
				this.close();
				const result:string = this.getFlashcards();
				this.onSubmit(result);
			})
		);
	}
	
	// close and remove content from the modal
	onClose() {
		const {contentEl } = this;
		contentEl.empty();
	}

	// define function to generate content for flashcards
	getFlashcards = ():string => {
		return new flashcardQuestionGenerator(this.phrase, this.imageLink, this.dictForm, this.mySettings).getAllFlashcards();
	}



}


class FlashcardModal extends Modal {
	// class variables 
	phrase: string;
	displayPhrase: string;
	imageLink: string;
	dictForm: string;
	clozeWord: string;
	clozeWordStartPosition: number;
	clozeWordEndPosition: number;
	phraseMinusClozeWord: string;
	flashCardDelineator = "\n\n";
	flagText: string;
	mySettings: LangFlashcardsPluginSettings

	onSubmit: (phrase: string) => void;

	constructor(
		app: App, 
		settings: LangFlashcardsPluginSettings,
		onSubmit: (phrase: string) => void

	) {
			super(app);
			this.mySettings = settings
			this.onSubmit = onSubmit;
		}

  
	onOpen() {
		const { contentEl } = this;
  
		contentEl.createEl("h1", { text: "Flashcard creator" });
		// Text box to allow entry of flashcard phrase
		new Setting(contentEl)
			.setName("Enter flashcard phrase:")
			.addText((text) =>
				text.onChange((value) => {
				this.phrase = value
			}));
		
			// Text box to allow entry of image url
		new Setting(contentEl)
			.setName("Enter image URL:")
			.addText((text) =>
				text.onChange((value) => {
				this.imageLink = "![image|400](" + value + ")";
			})); 

		new Setting(contentEl).addButton((btn) => btn
			.setButtonText("Browse..")	
			.setCta()
			.onClick(() => {
				window.open("https://giphy.com/")
			})
		)
		
		new Setting(contentEl).setName("Enter dictionary form of keyword:").addText((text) =>
				text.onChange((value) => {
				this.dictForm = value
			})
		); 

		new Setting(contentEl).addButton((btn) => btn
			.setButtonText("Submit")
			.setCta()
			.onClick(() => {
				this.close();
				//this.setClozeWord();
				//this.setPhraseMinusClozeWord();
				//this.setDisplayPhrase();
				const result:string = this.getFlashcards();
				this.onSubmit(result);
			})
		);
	}
	
	onClose() {
		const {contentEl } = this;
		contentEl.empty();
	}

	getFlashcards = ():string => {
		return new flashcardQuestionGenerator(this.phrase, this.imageLink, this.dictForm, this.mySettings).getAllFlashcards();
	}

}



/**
 *
 *
 * @class flashcardQuestionGenerator
 * class to generate obsidian flashcards
 */
class flashcardQuestionGenerator {
	// class variables
	// the phrase containing the demarcated keyword(s)
	phrase:string;
	// the keyword(s)
	clozeWord: string;	
	// link to an image representing the keyword(s)
	imageLink: string;
	// the dictianry form of the keyword(s)
	pluginSettings: LangFlashcardsPluginSettings
	dictForm: string;
	// the starting index of the keyword(s) in the phrase (calculated)
	clozeWordStartPosition: number;
	// the ending index of the keyword(s) in the phrase (calculated)
	clozeWordEndPosition: number;
	// a string containing the flashcard representation of the phrase as a cloze question (calculated)
	clozeQuestion: string;
	// a string containing the phrase with the keyword(s) missing (caluclated)
	phraseMinusClozeWord: string;
	// a string containing the flashcard representation of the what's this? question (calculated)
	whatsThis: string;
	// a string containing the flashcard representation of the "What's the Dictionary form?" question (calculated)
	whatsDictForm: string;
	// a string containing the flashcard representation of the "What's does this mean? (Dictionary form)" question	 (calculated)
	dictFormMeans: string;
	// a string containing the flashcard representation of the "Where does (the keyowd) go?" question (calulated)
	whereDoesItGo: string;
	// the characters used to seperate the keyword(s) from the rest of the phrase
	clozeDelimiters: Array<string>;
	// the phrase with the keywords not delineated from the rest of the phrase
	displayPhrase: string;
	// what to use as a break between flashcards
	delineator = "\n\n";
	// the header used to start a set of flashcards
	flashcardHeader = "#flashcards\n"

	/**
	 * Creates an instance of flashcardQuestionGenerator.
	 * @param {string} phrase
	 * - phrase containing delineated keyword(s)
	 * @param {string} imageLink
	 * - flashcard image
	 * @param {string} dictForm
	 * - disctionary form of keyword(s)
	 * @param {string []} clozeDelimiters
	 * - pair of strings used to delineate the keyword(s)
	 * @memberof flashcardQuestionGenerator
	 */
	constructor(
		phrase: string,
		imageLink: string,
		dictForm: string,
		pluginSettings: LangFlashcardsPluginSettings
	){
		// set up values for the class variables
		this.phrase = phrase;
		this.imageLink = imageLink;
		this.dictForm = dictForm;
		this.clozeDelimiters = this.getClozeDelimiters(pluginSettings);
		this.clozeWord = this.setClozeWord();
		this.displayPhrase = this.setDisplayPhrase();
		this.phraseMinusClozeWord = this.setPhraseMinusClozeWord();
		this.clozeQuestion = this.generateClozeQuestion();
		this.whatsThis = this.generateWhatsThis();
		this.whatsDictForm = this.generateWhatsDictForm();
		this.dictFormMeans = this.generateDictFormMeans();
		this.whereDoesItGo = this.generateWhereDoesItGo();
	}
	// add a new line
	addLine = (text: string): string => {
		return(text + "\n")
	}

	/**
	* generates a flashcard cloze question
	* used to set the value of clozeQuestion class variable
	*/

	generateClozeQuestion = (): string => {
		return(
			this.addLine("Fill in the blank") + 
			this.addLine(this.phrase) +
			this.addLine(this.imageLink) +
			this.delineator
		);
	}

	/**
	 * generate What's this? flashcard question
	 * used to set whatsThis class variable
	 * 
	 * @memberOf flashcardQuestionGenerator
	 */
	generateWhatsThis = (): string => {
		return(
			this.addLine("**What's this?**") +
			this.addLine(this.clozeWord) +
			this.addLine("?") +
			this.addLine("**" + this.clozeWord + "**") +
			this.addLine(this.displayPhrase) +
			this.addLine(this.imageLink) +
			this.delineator
		);
	}

	/**
	 * generate What's the dictionary form of (keyword(s)) flashcard question
	 * used to set whatsDictForm class variable
	 * 
	 * @memberOf flashcardQuestionGenerator
	 */
	generateWhatsDictForm = (): string => {
		return(
			this.addLine("What's the dictionary form for the missing word?") + 
			this.addLine(this.phraseMinusClozeWord) +
			this.addLine(this.imageLink) +
			this.addLine("?") +
			this.addLine(this.dictForm + "(dictionary form)") +
			this.addLine(this.displayPhrase) +
			this.addLine(this.imageLink)+
			this.delineator
		)
	}
	/**
	 * generate the display phrase (the phrase with the keyword(s) highlighted
	 * used to set display phrase class variable
	 * 
	 * @memberof flashcardQuestionGenerator
	 */
	setDisplayPhrase = (): string => {
		return this.phrase.replace(this.clozeDelimiters[0], "==").replace(this.clozeDelimiters[1], "==");
	}
	/**	
	 * generate the phrase with the keyword(s) missing
	 * used to set phraseMinuseClozeWord class variable
	 * @memberof flashcardQuestionGenerator
	 */
	setPhraseMinusClozeWord = (): string => {
		const clozeWordBlanked = `(${this.clozeWord.length})`;
		return this.phrase.substring(0, this.clozeWordStartPosition - 2) + 
			clozeWordBlanked + 
			this.phrase.substring(this.clozeWordEndPosition + 2);
	}
	/**
	 * get the keyword(s)
	 * used to set clozeWord class variable
	 * @memberof flashcardQuestionGenerator
	 */
	setClozeWord = (): string => {
		this.clozeWordStartPosition = this.phrase.indexOf(this.clozeDelimiters[0]) + 2;
		this.clozeWordEndPosition = this.phrase.indexOf(this.clozeDelimiters[1], this.clozeWordStartPosition + 1);
		return this.phrase.substring(this.clozeWordStartPosition, this.clozeWordEndPosition);
	}
	/**
	 * generate the What does this mean? flashcard using the dictionary form of the keyword(s)
	 * sets dictFormMeans class vaiable
	 * 
	 * @memberof flashcardQuestionGenerator
	 */
	generateDictFormMeans = (): string => {
		return(
			this.addLine("**What's this?**") +
			this.addLine(this.dictForm) +
			this.addLine("?") +
			this.addLine(this.displayPhrase) +
			this.addLine(this.imageLink) +
			this.addLine("Dictionary form: " + this.dictForm) +
			this.delineator
		)
	}
	/**
	 * generate the Where does (keyword) go in the sentence? flashcard
	 * sets whereDoesItGo class variable
	 * @memberof flashcardQuestionGenerator
	 */
	generateWhereDoesItGo = (): string => {
		return (
			this.addLine(`Where does ${this.clozeWord} go in the sentence?`) +
			this.addLine(
				this.phrase.substring(0, this.clozeWordStartPosition - 2).trim() +  " " +
				this.phrase.substring(this.clozeWordEndPosition + 3).trim()
			) +
			this.addLine(this.imageLink) +
			this.addLine("?") +
			this.addLine(this.displayPhrase) +
			this.addLine(this.imageLink) +
			this.addLine("Dictionary form:") +
			this.addLine(this.dictForm) +
			this.delineator
		);
	}
	/**
	 * return a string containing all of the flashcard types and a header
	 *
	 * @memberof flashcardQuestionGenerator
	 */
	getAllFlashcards = ():string => {
		return (
		this.flashcardHeader +

		this.clozeQuestion +

		this.whatsThis +

		this.whatsDictForm +

		this.dictFormMeans +

		this.whereDoesItGo
		)
	}

	getClozeDelimiters = (pluginSettings: LangFlashcardsPluginSettings): Array<string> => {
		const delimiters = new Map<string, Array<string>>([
			['highlight', ['==', '==']],
			['bold', ['**', "**"]],
			['curly', ['{{', '}}']]
			]);
		// this.flagText = this.mySettings.clozeDelimiter == "bold" ? "==" : "**";
		return delimiters.get(pluginSettings.clozeDelimiter)??["==","=="]
	}
}