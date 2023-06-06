import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface LangFlashcardsPluginSettings {
	clozeDelimiter: string;
}

const DEFAULT_SETTINGS: LangFlashcardsPluginSettings = {
	clozeDelimiter: "highlight"
}

export default class LangFlashcardsPlugin extends Plugin {
	settings: LangFlashcardsPluginSettings;
	auto_translate = false;
	translator;

	async onload() {
		await this.loadSettings();
		this.app.workspace.onLayoutReady(() => {
			this.translator = app.plugins.plugins["translate"]?.translator
			if (this.translator && this.translator.valid) {
				this.auto_translate = true;
			}
			console.log(`translator is ${this.translator}`);
			console.log(`translator.valid is ${this.translator.valid}`);
			console.log(`Auto translate is ${this.auto_translate}`);
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

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-flashcard-modal',
			name: 'Create Language Flashcards',
			editorCallback: (editor: Editor) => {
				const lastLine = editor.lastLine();
				editor.replaceRange("\n",{line: lastLine, ch:editor.getLine(lastLine).length});

				const onSubmit = (phrase: string) => {
					const lastLine = editor.lastLine();
					editor.setSelection({line: lastLine, ch: 0})
					editor.replaceSelection(`${phrase}`);
				};
			
			
				new FlashcardModal(this.app, this.settings, onSubmit).open();
			},
			
		});

		function extractSentence(paragraph: string, selection: string, cursor_pos: number): string{
			// check cursor is at end of selection
			let selection_check = paragraph.slice(cursor_pos - selection.length, cursor_pos)
			if (selection_check != selection) {
			// cursor is at wrong end of selection
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
			console.log(`paragraph = ${paragraph}`);
			console.log(`selection = ${selection}`)
			console.log(`cursor_pos = ${cursor_pos}`);
			return sentence;
		}

		this.addCommand({
			id: 'create-flashcard-from-selection',
			name: "Create Language Flashcard from Selection",
			editorCallback: async (editor: Editor) => {
				const lastLine = editor.lastLine();
				editor.replaceRange("\n",{line: lastLine, ch:editor.getLine(lastLine).length});
				const selectedText:string = editor.getSelection();
				//get current paragraph
				const containingSentence = editor.getLine(editor.getCursor().line)
				const cursor_pos = editor.getCursor().ch
				const flashcard_sentence = extractSentence(containingSentence, selectedText, cursor_pos);
				const translated_keyword = await this.translator.translate(selectedText, "es", "en");
				console.log(translated_keyword);
				const onSubmit = (phrase: string) => {
					const lastLine = editor.lastLine();
					editor.setSelection({line: lastLine, ch: 0})
					editor.replaceSelection(`${phrase}`);
				};
			
			
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

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}


}
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
	phraseMinusClozeWord: string;
	flashCardDelineator = "\n\n";
	flagText: string;
	mySettings: LangFlashcardsPluginSettings

	onSubmit: (phrase: string) => void;

	constructor(
		app: App, 
		phrase: string,
		translated_keyword: string,
		settings: LangFlashcardsPluginSettings,
		onSubmit: (phrase: string) => void

	) {
			super(app);
			this.phrase = phrase;
			this.translated_keyword = translated_keyword;
			this.mySettings = settings
			this.onSubmit = onSubmit;
		}

  
	onOpen() {
		const { contentEl } = this;
  
		contentEl.createEl("h1", { text: "Create flashcard from selection" });
		// Text box to allow entry of flashcard phrase
		new Setting(contentEl)
			.setName("Phrase")
			.addText(text => text
				.setValue(this.phrase)
				.onChange((value) => {
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
				window.open(`https://giphy.com/search/${this.translated_keyword}`)
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
				this.setClozeWord();
				this.setPhraseMinusClozeWord();
				this.setDisplayPhrase();
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
		return (
			this.addLine("#flashcards") +
			this.generateCloze() +
			this.generateWhatsThis() +
			this.generateWhatsDictForm() + 
			this.generateDictFormMeans() +
			this.generateWhereDoesItGo()
		)
	}

	addLine = (text: string): string => {
		return(text + "\n")
	}

	generateCloze = ():string => {
		return (
			this.addLine("Fill in the blank") + 
			this.addLine(this.phrase) +
			this.addLine(this.imageLink) +
			this.flashCardDelineator
		);
	}

	generateWhatsThis = (): string => {
		return(
			this.addLine("**What's this?**") +
			this.addLine(this.clozeWord) +
			this.addLine("?") +
			this.addLine("**" + this.clozeWord + "**") +
			this.addLine(this.displayPhrase) +
			this.addLine(this.imageLink) +
			this.flashCardDelineator
		);
	}

	generateWhatsDictForm = (): string => {
		return(
			this.addLine("What's the dictionary form for the missing word?") + 
			this.addLine(this.phraseMinusClozeWord) +
			this.addLine(this.imageLink) +
			this.addLine("?") +
			this.addLine(this.dictForm + "(dictionary form)") +
			this.addLine(this.displayPhrase) +
			this.addLine(this.imageLink)+
			this.flashCardDelineator
		)
	}

	generateDictFormMeans = (): string => {
		return(
			this.addLine("**What's this?**") +
			this.addLine(this.dictForm) +
			this.addLine("?") +
			this.addLine(this.displayPhrase) +
			this.addLine(this.imageLink) +
			this.addLine("Dictionary form: " + this.dictForm) +
			this.flashCardDelineator
		)
	}

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
			this.flashCardDelineator
		);
	}

	getClozeDelimiters = (): Array<string> => {
		const delimiters = new Map<string, Array<string>>([
			['highlight', ['==', '==']],
			['bold', ['**', "**"]],
			['curly', ['{{', '}}']]
			]);
		// this.flagText = this.mySettings.clozeDelimiter == "bold" ? "==" : "**";
		return delimiters.get(this.mySettings.clozeDelimiter)??["==","=="]
	}

	setClozeWord = (): void => {
		const clozeDelimiters: Array<string> = this.getClozeDelimiters();
		this.clozeWordStartPosition = this.phrase.indexOf(clozeDelimiters[0]) + 2;
		this.clozeWordEndPosition = this.phrase.indexOf(clozeDelimiters[1], this.clozeWordStartPosition + 1);
		this.clozeWord = this.phrase.substring(this.clozeWordStartPosition, this.clozeWordEndPosition);
	}

	setDisplayPhrase = (): void => {
		const delimiters: string[] = this.getClozeDelimiters();
		this.displayPhrase = this.phrase.replace(delimiters[0], "==").replace(delimiters[1], "==");
	}

	setPhraseMinusClozeWord = (): void => {
		const clozeWordLength = this.clozeWord.length;
		const clozeWordBlanked = " " + "_ ".repeat(clozeWordLength);
		this.phraseMinusClozeWord = this.phrase.substring(0, this.clozeWordStartPosition - 2) + 
			clozeWordBlanked + 
			this.phrase.substring(this.clozeWordEndPosition + 2);
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
				this.setClozeWord();
				this.setPhraseMinusClozeWord();
				this.setDisplayPhrase();
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
		return (
			this.addLine("#flashcards") +
			this.generateCloze() +
			this.generateWhatsThis() +
			this.generateWhatsDictForm() + 
			this.generateDictFormMeans() +
			this.generateWhereDoesItGo()
		)
	}

	addLine = (text: string): string => {
		return(text + "\n")
	}

	generateCloze = ():string => {
		return (
			this.addLine("Fill in the blank") + 
			this.addLine(this.phrase) +
			this.addLine(this.imageLink) +
			this.flashCardDelineator
		);
	}

	generateWhatsThis = (): string => {
		return(
			this.addLine("**What's this?**") +
			this.addLine(this.clozeWord) +
			this.addLine("?") +
			this.addLine("**" + this.clozeWord + "**") +
			this.addLine(this.displayPhrase) +
			this.addLine(this.imageLink) +
			this.flashCardDelineator
		);
	}

	generateWhatsDictForm = (): string => {
		return(
			this.addLine("What's the dictionary form for the missing word?") + 
			this.addLine(this.phraseMinusClozeWord) +
			this.addLine(this.imageLink) +
			this.addLine("?") +
			this.addLine(this.dictForm + "(dictionary form)") +
			this.addLine(this.displayPhrase) +
			this.addLine(this.imageLink)+
			this.flashCardDelineator
		)
	}

	generateDictFormMeans = (): string => {
		return(
			this.addLine("**What's this?**") +
			this.addLine(this.dictForm) +
			this.addLine("?") +
			this.addLine(this.displayPhrase) +
			this.addLine(this.imageLink) +
			this.addLine("Dictionary form: " + this.dictForm) +
			this.flashCardDelineator
		)
	}

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
			this.flashCardDelineator
		);
	}

	getClozeDelimiters = (): Array<string> => {
		const delimiters = new Map<string, Array<string>>([
			['highlight', ['==', '==']],
			['bold', ['**', "**"]],
			['curly', ['{{', '}}']]
			]);
		// this.flagText = this.mySettings.clozeDelimiter == "bold" ? "==" : "**";
		return delimiters.get(this.mySettings.clozeDelimiter)??["==","=="]
	}

	setClozeWord = (): void => {
		const clozeDelimiters: Array<string> = this.getClozeDelimiters();
		this.clozeWordStartPosition = this.phrase.indexOf(clozeDelimiters[0]) + 2;
		this.clozeWordEndPosition = this.phrase.indexOf(clozeDelimiters[1], this.clozeWordStartPosition + 1);
		this.clozeWord = this.phrase.substring(this.clozeWordStartPosition, this.clozeWordEndPosition);
	}

	setDisplayPhrase = (): void => {
		const delimiters: string[] = this.getClozeDelimiters();
		this.displayPhrase = this.phrase.replace(delimiters[0], "==").replace(delimiters[1], "==");
	}

	setPhraseMinusClozeWord = (): void => {
		const clozeWordLength = this.clozeWord.length;
		const clozeWordBlanked = " " + "_ ".repeat(clozeWordLength);
		this.phraseMinusClozeWord = this.phrase.substring(0, this.clozeWordStartPosition - 2) + 
			clozeWordBlanked + 
			this.phrase.substring(this.clozeWordEndPosition + 2);
	}

	

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