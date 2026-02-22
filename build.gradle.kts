plugins {
    id("org.jetbrains.kotlin.jvm") version "2.1.0"
    id("org.jetbrains.intellij.platform") version "2.10.4"
    id("org.jetbrains.kotlin.plugin.serialization") version "2.1.0"
}

group = "com.github.yhk1038"
version = "0.1.0"

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

dependencies {
    intellijPlatform {
        val platformVersion = providers.gradleProperty("platformVersion").getOrElse("2025.3.2")

        intellijIdea(platformVersion)
    }

    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.1")
}

kotlin {
    jvmToolchain(21)
}

intellijPlatform {
    pluginConfiguration {
        id = "com.github.yhk1038.claude-code-gui"
        name = "Claude Code GUI"
        version = project.version.toString()
        description = "Claude Code GUI for JetBrains IDEs - Cursor-like UX"
        vendor {
            name = "yhk1038"
            url = "https://github.com/yhk1038"
        }
        ideaVersion {
            sinceBuild = "253"
            untilBuild = "253.*"
        }
        changeNotes = """
            <h3>0.1.0 - Initial Release</h3>
            <ul>
                <li>Chat interface with Claude Code agent</li>
                <li>Streaming responses with Markdown rendering</li>
                <li>Tool call visualization (file read/write, bash, search)</li>
                <li>Diff cards with Apply/Reject actions</li>
                <li>Permission management for file operations</li>
                <li>Session management with multiple tabs</li>
                <li>Integrated settings panel</li>
            </ul>
        """.trimIndent()
    }
    publishing {
        token = providers.environmentVariable("PUBLISH_TOKEN")
    }
}

tasks {
    wrapper {
        gradleVersion = "8.13"
    }

    // Enable dev mode for runIde (uses Vite dev server if available)
    // Can be disabled via: CLAUDE_DEV_MODE=false ./gradlew runIde
    named<org.jetbrains.intellij.platform.gradle.tasks.RunIdeTask>("runIde") {
        jvmArgumentProviders += CommandLineArgumentProvider {
            listOf("-Dclaude.dev.mode=${System.getenv("CLAUDE_DEV_MODE") ?: "true"}")
        }
    }
}
