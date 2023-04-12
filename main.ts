import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface LangFlashcardsPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: LangFlashcardsPluginSettings = {
	mySetting: 'default'
}

export default class LangFlashcardsPlugin extends Plugin {
	settings: LangFlashcardsPluginSettings;

	async onload() {
		await this.loadSettings();
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
			name: 'Open flashcard creator',
			editorCallback: (editor: Editor) => {
				const selectedText:string = editor.getSelection();

				const onSubmit = (phrase: string) => {
					editor.replaceSelection(`${phrase}`);
				};
			
			
				new FlashcardModal(this.app, onSubmit).open();
			},
			
		});

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

class FlashcardModal extends Modal {
	// class variables 
	phrase: string;
	imageLink: string;
	dictForm: string;
	clozeWord: string;
	phraseMinusClozeWord: string;
	flashCardDelineator = "\n\n";

	onSubmit: (phrase: string) => void;

	constructor(
		app: App, 
		onSubmit: (phrase: string) => void
	) {
			super(app);
			this.onSubmit = onSubmit;
		}

  
	onOpen() {
		const { contentEl } = this;
  
		contentEl.createEl("h1", { text: "Flashcard creator" });
  
		new Setting(contentEl)
			.setName("Enter flashcard phrase:")
			.addText((text) =>
				text.onChange((value) => {
				this.phrase = value
			}));
		
			new Setting(contentEl)
			.setName("Enter image URL:")
			.addText((text) =>
				text.onChange((value) => {
				this.imageLink = "![image](" + value + ")";
			})); 
		
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
				const startPosition = this.phrase.indexOf("==") + 2;
				const endPosition = this.phrase.indexOf("==", startPosition + 1);
				this.clozeWord = this.phrase.substring(startPosition, endPosition);
				this.phraseMinusClozeWord = this.phrase.substring(0, startPosition - 2) + " . . . . . " + this.phrase.substring(endPosition + 2);
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
			this.generateDictFormMeans()
		)
	}

	addLine = (text: string): string => {
		return(text + "\n")
	}

	generateCloze = ():string => {
		return (
			this.addLine("**Fill in the blank**") + 
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
			this.addLine(this.phrase) +
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
			this.addLine(this.phrase) +
			this.addLine(this.imageLink)+
			this.flashCardDelineator
		)
	}

	generateDictFormMeans = (): string => {
		return(
			this.addLine("**What's this?**") +
			this.addLine(this.dictForm) +
			this.addLine("?") +
			this.addLine(this.phrase) +
			this.addLine(this.imageLink) +
			this.addLine("Dictionary form: " + this.dictForm) +
			this.flashCardDelineator
		)
	}
}
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

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
