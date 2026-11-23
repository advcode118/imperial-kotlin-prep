#!/bin/sh
# Compiles the code, then compiles and runs the tests.
# Needs a JDK and the Kotlin command-line compiler (kotlinc) on your PATH,
# and curl to fetch JUnit the first time it is run.
set -e
cd "$(dirname "$0")"

command -v kotlinc >/dev/null || { echo "kotlinc not found: see README.md"; exit 1; }

mkdir -p lib out
fetch() {
    [ -f "lib/$(basename "$1")" ] || curl -fsSL -o "lib/$(basename "$1")" "https://repo1.maven.org/maven2/$1"
}
KOTLIN_TEST_VERSION=2.0.21
fetch junit/junit/4.13.2/junit-4.13.2.jar
fetch org/hamcrest/hamcrest-core/1.3/hamcrest-core-1.3.jar
fetch org/jetbrains/kotlin/kotlin-test/$KOTLIN_TEST_VERSION/kotlin-test-$KOTLIN_TEST_VERSION.jar
fetch org/jetbrains/kotlin/kotlin-test-junit/$KOTLIN_TEST_VERSION/kotlin-test-junit-$KOTLIN_TEST_VERSION.jar

LIBS=$(ls lib/*.jar | tr '\n' ':')

echo "Compiling..."
kotlinc src/main/kotlin/*.kt src/test/kotlin/*.kt -cp "$LIBS" -include-runtime -d out/library.jar

echo "Running tests..."
java -cp "out/library.jar:$LIBS" org.junit.runner.JUnitCore LibraryTest
